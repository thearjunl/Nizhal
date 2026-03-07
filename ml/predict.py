import joblib
import pandas as pd
from feature_extraction import extract_features

model=joblib.load("phishing_model.pkl")
url=input("Enter URL:")
features=extract_features(url)
df=pd.DataFrame([features])
prediction=model.predict(df)

if prediction[0]==1:
    print("Phishing URL detected")
else:
    print("Legitimate URL")
