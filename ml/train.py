import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
import joblib

data = pd.read_csv("data/dataset_phishing.csv")
print("Dataset shape:", data.shape)


data["status"] = data["status"].map({
    "legitimate": 0,
    "phishing": 1
})

data = data.dropna(subset=["status"])
selected_features=[
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
X=data[selected_features]
X=X.fillna(0)
y = data["status"]

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)

lr_pipeline = Pipeline([
    ("scaler", StandardScaler()),
    ("lr", LogisticRegression(max_iter=5000))
])

lr_pipeline.fit(X_train, y_train)
lr_preds = lr_pipeline.predict(X_test)
print("Logistic Regression Results")
print(classification_report(y_test, lr_preds))

rf = RandomForestClassifier(
    n_estimators=300,
    max_depth=25,
    random_state=42,
    n_jobs=-1
)
rf.fit(X_train, y_train)
rf_preds = rf.predict(X_test)
print("Random Forest Results")
print(classification_report(y_test, rf_preds))
joblib.dump(rf, "phishing_model.pkl")

print("\nModel saved as phishing_model.pkl")
