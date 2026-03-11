from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, field_validator
from contextlib import asynccontextmanager
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import logging
import hashlib
import json
import joblib
import pandas as pd
from feature_extraction import extract_features
import os
import ipaddress
import socket
from urllib.parse import urlparse
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("nizhal")

load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_SAFE_BROWSING_API_KEY")

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
RATE_LIMIT = os.getenv("RATE_LIMIT", "30/minute")

# Load the model on startup via lifespan
MODEL_PATH = "phishing_model.pkl"
METADATA_PATH = "model_metadata.json"
model = None
model_metadata = None

@asynccontextmanager
async def lifespan(app):
    global model, model_metadata
    if os.path.exists(MODEL_PATH):
        # Verify integrity if metadata exists
        if os.path.exists(METADATA_PATH):
            with open(METADATA_PATH, "r") as f:
                model_metadata = json.load(f)
            with open(MODEL_PATH, "rb") as f:
                actual_hash = hashlib.sha256(f.read()).hexdigest()
            expected_hash = model_metadata.get("sha256")
            if expected_hash and actual_hash != expected_hash:
                logger.error("Model integrity check FAILED. Expected SHA-256: %s, got: %s", expected_hash, actual_hash)
                yield
                return
            logger.info("Model integrity verified (SHA-256: %s)", actual_hash[:16])
        else:
            logger.warning("No model_metadata.json found, skipping integrity check")
            model_metadata = {"version": "unknown", "sha256": "unknown"}
        model = joblib.load(MODEL_PATH)
        logger.info("Model v%s loaded from %s", model_metadata.get("version", "unknown"), MODEL_PATH)
    else:
        logger.warning("Model not found at %s", MODEL_PATH)
    yield

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Nizhal Phishing Detection API", lifespan=lifespan)
app.state.limiter = limiter

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded. Try again later."}
    )

# Configure CORS for the Chrome Extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

def _is_public_url(url: str) -> bool:
    """Check if a URL resolves to a public (non-private, non-loopback) IP address."""
    try:
        parsed = urlparse(url)
        hostname = parsed.hostname
        if not hostname:
            return False
        # Resolve hostname to IP
        addr_info = socket.getaddrinfo(hostname, None)
        for family, _, _, _, sockaddr in addr_info:
            ip = ipaddress.ip_address(sockaddr[0])
            if ip.is_private or ip.is_loopback or ip.is_reserved or ip.is_link_local:
                return False
        return True
    except (socket.gaierror, ValueError):
        return False


class URLRequest(BaseModel):
    url: str

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        v = v.strip()
        if len(v) > 2048:
            raise ValueError("URL exceeds maximum length of 2048 characters")
        parsed = urlparse(v)
        if parsed.scheme not in ("http", "https"):
            raise ValueError("Only http and https URLs are allowed")
        if not parsed.hostname:
            raise ValueError("URL must contain a valid hostname")
        return v

class PredictionResponse(BaseModel):
    url: str
    isMalicious: bool
    confidence: float
    features: dict

@app.get("/model/info")
def model_info():
    if model_metadata is None:
        raise HTTPException(status_code=503, detail="Model metadata not available")
    return model_metadata

@app.post("/predict", response_model=PredictionResponse)
@limiter.limit(RATE_LIMIT)
def predict_url(body: URLRequest, request: Request):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    # Feature 3: External Threat APIs (Google Safe Browsing)
    if GOOGLE_API_KEY:
        try:
            gsb_url = f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={GOOGLE_API_KEY}"
            payload = {
                "client": {"clientId": "nizhal-extension", "clientVersion": "1.0.0"},
                "threatInfo": {
                    "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
                    "platformTypes": ["ANY_PLATFORM"],
                    "threatEntryTypes": ["URL"],
                    "threatEntries": [{"url": body.url}]
                }
            }
            resp = requests.post(gsb_url, json=payload, timeout=2)
            if resp.status_code == 200:
                data = resp.json()
                if "matches" in data and len(data["matches"]) > 0:
                    return PredictionResponse(
                        url=body.url,
                        isMalicious=True,
                        confidence=1.0,
                        features={"source": "Google Safe Browsing API"}
                    )
        except Exception as e:
            logger.error("Safe Browsing API Error: %s", e)

    # Fallback to ML Model: Extract features using the existing feature extraction logic
    features_dict = extract_features(body.url)
    feature_df = pd.DataFrame([features_dict])
    
    # Run prediction (1 for phishing, 0 for legitimate)
    prediction = model.predict(feature_df)[0]
    probabilities = model.predict_proba(feature_df)[0]
    
    is_malicious = bool(prediction == 1)
    confidence = float(probabilities[1] if is_malicious else probabilities[0])

    # Feature 2: NLP/Text Analysis
    # Scrape the page text to look for urgent or suspicious keywords
    # Only scrape URLs that resolve to public IP addresses to prevent SSRF
    try:
        if not _is_public_url(body.url):
            raise ValueError("URL resolves to a non-public address")
        page_resp = requests.get(body.url, timeout=2, allow_redirects=False) # Short timeout, no redirects
        soup = BeautifulSoup(page_resp.text, 'html.parser')
        page_text = soup.get_text().lower()
        
        # Simple Keyword Density Check
        suspicious_keywords = ["urgent", "password", "reset", "login", "suspended", "verify", "account", "unauthorized", "security"]
        keyword_hits = sum(1 for word in suspicious_keywords if word in page_text)
        
        if keyword_hits >= 3:
            is_malicious = True
            confidence = min(1.0, confidence + 0.3)
            features_dict['nlp_flagged'] = True
        else:
            features_dict['nlp_flagged'] = False
            
    except Exception as e:
        features_dict['nlp_flagged'] = False
        features_dict['scrape_error'] = "Page content could not be analysed"
        logger.warning("NLP scrape failed for %s: %s", body.url, e)

    return PredictionResponse(
        url=body.url,
        isMalicious=is_malicious,
        confidence=confidence,
        features=features_dict
    )

if __name__ == "__main__":
    import uvicorn
    ssl_keyfile = os.getenv("SSL_KEYFILE", "/app/certs/key.pem")
    ssl_certfile = os.getenv("SSL_CERTFILE", "/app/certs/cert.pem")
    uvicorn.run("api_server:app", host="0.0.0.0", port=8000, reload=True,
                ssl_keyfile=ssl_keyfile, ssl_certfile=ssl_certfile)
