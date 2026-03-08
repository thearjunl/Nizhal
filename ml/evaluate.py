import joblib
import pandas as pd
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns

def main():
    model = joblib.load("phishing_model.pkl")
    print("Model loaded successfully.")
    data = pd.read_csv("dataset_phishing.csv")
    data["status"] = data["status"].map({
        "legitimate": 0,
        "phishing": 1
    })

    data = data.dropna(subset=["status"])
    y = data["status"]
    X = data.drop(["status", "url"], axis=1).fillna(0)
    preds = model.predict(X)

    print("Model Evaluation Results")
    print(classification_report(y, preds))
    
    cm = confusion_matrix(y, preds)
    plt.figure(figsize=(6,5))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues")
    plt.xlabel("Predicted Label")
    plt.ylabel("True Label")
    plt.title("Confusion Matrix - Phishing Detection")
    plt.tight_layout()
    plt.show()


if __name__ == "__main__":
    main()
