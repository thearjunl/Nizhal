import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import numpy as np


@pytest.fixture
def client():
    """Create a test client with a mocked model."""
    import api_server
    # Mock the model
    mock_model = MagicMock()
    mock_model.predict.return_value = np.array([0])
    mock_model.predict_proba.return_value = np.array([[0.9, 0.1]])
    api_server.model = mock_model

    with TestClient(api_server.app) as c:
        yield c
    api_server.model = None


def test_predict_legitimate_url(client):
    with patch("api_server.requests.get", side_effect=Exception("skip scrape")):
        resp = client.post("/predict", json={"url": "https://www.google.com"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["isMalicious"] is False
    assert "confidence" in data
    assert "features" in data


def test_predict_returns_features(client):
    with patch("api_server.requests.get", side_effect=Exception("skip scrape")):
        resp = client.post("/predict", json={"url": "https://example.com/test"})
    data = resp.json()
    assert "length_url" in data["features"]
    assert "nb_dots" in data["features"]


def test_predict_malicious_model(client):
    import api_server
    mock_model = MagicMock()
    mock_model.predict.return_value = np.array([1])
    mock_model.predict_proba.return_value = np.array([[0.15, 0.85]])
    api_server.model = mock_model

    with patch("api_server.requests.get", side_effect=Exception("skip scrape")):
        resp = client.post("/predict", json={"url": "https://evil-site.com/phish"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["isMalicious"] is True
    assert data["confidence"] == pytest.approx(0.85)


def test_reject_non_http_scheme(client):
    resp = client.post("/predict", json={"url": "ftp://example.com/file"})
    assert resp.status_code == 422


def test_reject_javascript_scheme(client):
    resp = client.post("/predict", json={"url": "javascript:alert(1)"})
    assert resp.status_code == 422


def test_reject_too_long_url(client):
    long_url = "https://example.com/" + "a" * 2100
    resp = client.post("/predict", json={"url": long_url})
    assert resp.status_code == 422


def test_reject_empty_url(client):
    resp = client.post("/predict", json={"url": ""})
    assert resp.status_code == 422


def test_reject_no_hostname(client):
    resp = client.post("/predict", json={"url": "https://"})
    assert resp.status_code == 422


def test_model_not_loaded():
    import api_server
    original_model = api_server.model
    api_server.model = None
    try:
        with TestClient(api_server.app) as c:
            resp = c.post("/predict", json={"url": "https://example.com"})
        assert resp.status_code == 503
    finally:
        api_server.model = original_model


def test_missing_body(client):
    resp = client.post("/predict")
    assert resp.status_code == 422
