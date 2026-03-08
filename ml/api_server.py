from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
from feature_extraction import extract_features
import os

app = FastAPI(title="Nizhal Phishing Detection API")

# Configure CORS for the Chrome Extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production to specific domain/chrome-extension ID
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

class URLRequest(BaseModel):
    url: str

class PredictionResponse(BaseModel):
    url: str
    isMalicious: bool
    confidence: float
    features: dict

@app.post("/predict", response_model=PredictionResponse)
def predict_url(request: URLRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    # Extract features using the existing feature extraction logic
    features_dict = extract_features(request.url)
    
    # The models were trained expecting specific feature ordering from pandas
    # The features are: 'length_url', 'length_hostname', 'nb_dots', 'nb_hyphens', 'nb_at', 'nb_qm', 'nb_and', 'nb_eq', 'nb_percent', 'nb_slash', 'nb_www', 'nb_com', 'ratio_digits_url', 'nb_subdomains'
    feature_df = pd.DataFrame([features_dict])
    
    # Run prediction (1 for phishing, 0 for legitimate)
    prediction = model.predict(feature_df)[0]
    probabilities = model.predict_proba(feature_df)[0]
    
    is_malicious = bool(prediction == 1)
    confidence = float(probabilities[1] if is_malicious else probabilities[0])

    return PredictionResponse(
        url=request.url,
        isMalicious=is_malicious,
        confidence=confidence,
        features=features_dict
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api_server:app", host="127.0.0.1", port=8000, reload=True)
