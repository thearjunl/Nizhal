import joblib
import pandas as pd
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns

def main():
    model = joblib.load("phishing_model.pkl")
    print("Model loaded successfully.")
    data = pd.read_csv("data/dataset_phishing.csv")
    data["status"] = data["status"].map({
        "legitimate": 0,
        "phishing": 1
    })

    data = data.dropna(subset=["status"])
    y = data["status"]
    selected_features = [
        'length_url',
        'length_hostname',
        'nb_dots',
        'nb_hyphens',
        'nb_at',
        'nb_qm',
        'nb_and',
        'nb_eq',
        'nb_percent',
        'nb_slash',
        'nb_www',
        'nb_com',
        'ratio_digits_url',
        'nb_subdomains'
    ]
    X = data[selected_features].fillna(0)
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
