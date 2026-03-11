"""CLI tool to test a single URL against the trained phishing detection model."""

import sys
import os
import joblib
import json
import hashlib
import pandas as pd
from feature_extraction import extract_features

MODEL_PATH = "phishing_model.pkl"
METADATA_PATH = "model_metadata.json"


def load_model():
    """Load the model and verify its integrity against stored metadata."""
    if not os.path.exists(MODEL_PATH):
        print(f"Error: model file '{MODEL_PATH}' not found. Run train.py first.")
        sys.exit(1)

    if os.path.exists(METADATA_PATH):
        with open(METADATA_PATH, "r") as f:
            metadata = json.load(f)
        with open(MODEL_PATH, "rb") as f:
            actual_hash = hashlib.sha256(f.read()).hexdigest()
        expected_hash = metadata.get("sha256")
        if expected_hash and actual_hash != expected_hash:
            print("Error: model integrity check failed — file may be corrupted.")
            sys.exit(1)
        print(f"Model v{metadata.get('version', 'unknown')} loaded (SHA-256 verified)")
    else:
        print("Warning: no model_metadata.json found, skipping integrity check")

    return joblib.load(MODEL_PATH)


def main():
    model = load_model()
    url = input("Enter URL: ").strip()
    if not url:
        print("Error: URL cannot be empty.")
        sys.exit(1)

    features = extract_features(url)
    df = pd.DataFrame([features])
    prediction = model.predict(df)[0]
    probabilities = model.predict_proba(df)[0]

    if prediction == 1:
        print(f"Phishing URL detected (confidence: {probabilities[1]:.1%})")
    else:
        print(f"Legitimate URL (confidence: {probabilities[0]:.1%})")


if __name__ == "__main__":
    main()
