from urllib.parse import urlparse
def extract_features(url):
    parsed=urlparse(url)
    hostname=parsed.hostname or ""
    features={
        "length_url":len(url),
        "length_hostname":len(hostname),
        "nb_dots":url.count("."),
        "nb_hyphens":url.count("-"),
        "nb_at":url.count("@"),
        "nb_qm":url.count("?"),
        "nb_and":url.count("&"),
        "nb_eq":url.count("="),
        "nb_percent":url.count("%"),
        "nb_slash":url.count("/"),
        "nb_www":hostname.count("www"),
        "nb_com":url.count(".com"),
        "ratio_digits_url":sum(c.isdigit() for c in url)/len(url) if len(url) else 0,
        "nb_subdomains":hostname.count(".")
    }
    return features