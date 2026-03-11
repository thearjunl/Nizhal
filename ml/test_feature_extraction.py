import pytest
from feature_extraction import extract_features


def test_basic_url_features():
    features = extract_features("https://www.example.com/path")
    assert features["length_url"] == len("https://www.example.com/path")
    assert features["length_hostname"] == len("www.example.com")
    assert features["nb_dots"] == 2  # www.example.com
    assert features["nb_slash"] == 3  # https://  + /path
    assert features["nb_www"] == 1
    assert features["nb_com"] == 1


def test_special_characters():
    url = "https://example.com/page?a=1&b=2&c=3"
    features = extract_features(url)
    assert features["nb_qm"] == 1
    assert features["nb_and"] == 2
    assert features["nb_eq"] == 3


def test_hyphens_and_at():
    url = "https://my-site.example.com/user@info"
    features = extract_features(url)
    assert features["nb_hyphens"] == 1
    assert features["nb_at"] == 1


def test_percent_encoding():
    url = "https://example.com/path%20with%20spaces"
    features = extract_features(url)
    assert features["nb_percent"] == 2


def test_ratio_digits():
    url = "https://example.com/12345"
    features = extract_features(url)
    digit_count = sum(c.isdigit() for c in url)
    assert features["ratio_digits_url"] == pytest.approx(digit_count / len(url))


def test_subdomains():
    url = "https://a.b.c.example.com/"
    features = extract_features(url)
    # a.b.c.example.com has 4 dots in hostname
    assert features["nb_subdomains"] == 4


def test_no_www():
    url = "https://example.com/"
    features = extract_features(url)
    assert features["nb_www"] == 0


def test_all_14_features_present():
    features = extract_features("https://example.com")
    expected_keys = [
        "length_url", "length_hostname", "nb_dots", "nb_hyphens",
        "nb_at", "nb_qm", "nb_and", "nb_eq", "nb_percent",
        "nb_slash", "nb_www", "nb_com", "ratio_digits_url", "nb_subdomains"
    ]
    for key in expected_keys:
        assert key in features, f"Missing feature: {key}"
    assert len(features) == 14


def test_empty_path_url():
    features = extract_features("https://example.com")
    assert features["length_url"] > 0
    assert features["nb_slash"] == 2  # https://
