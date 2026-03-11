from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
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

load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_SAFE_BROWSING_API_KEY")

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app = FastAPI(title="Nizhal Phishing Detection API")

# Configure CORS for the Chrome Extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["POST"],
    allow_headers=["Content-Type"],
)

# Load the model on startup
MODEL_PATH = "phishing_model.pkl"
model = None

@app.on_event("startup")
def load_model():
    global model
    if os.path.exists(MODEL_PATH):
        model = joblib.load(MODEL_PATH)
        print(f"Model loaded successfully from {MODEL_PATH}")
    else:
        print(f"Warning: Model not found at {MODEL_PATH}")

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

@app.post("/predict", response_model=PredictionResponse)
def predict_url(request: URLRequest):
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
                    "threatEntries": [{"url": request.url}]
                }
            }
            resp = requests.post(gsb_url, json=payload, timeout=2)
            if resp.status_code == 200:
                data = resp.json()
                if "matches" in data and len(data["matches"]) > 0:
                    return PredictionResponse(
                        url=request.url,
                        isMalicious=True,
                        confidence=1.0,
                        features={"source": "Google Safe Browsing API"}
                    )
        except Exception as e:
            print(f"Safe Browsing API Error: {e}")

    # Fallback to ML Model: Extract features using the existing feature extraction logic
    features_dict = extract_features(request.url)
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
        if not _is_public_url(request.url):
            raise ValueError("URL resolves to a non-public address")
        page_resp = requests.get(request.url, timeout=2, allow_redirects=False) # Short timeout, no redirects
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
        features_dict['scrape_error'] = str(e)

    return PredictionResponse(
        url=request.url,
        isMalicious=is_malicious,
        confidence=confidence,
        features=features_dict
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api_server:app", host="0.0.0.0", port=8000, reload=True)
