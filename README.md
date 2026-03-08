<div align="center">
  <img src="icons/icon128.png" alt="Nizhal Logo" width="128">
  <h1>Nizhal</h1>
  <p><em>A stealthy, high-performance security extension that acts as a protective shadow.</em></p>
</div>

Nizhal is a modern, privacy-focused Chrome Extension designed to detect malicious URLs, phishing attempts, and suspicious vibe checks in real-time. It leverages a lightweight local heuristic engine backed by a powerful Python Fast-API Machine Learning service and external Threat Intelligence.

## 🚀 Features

*   **Real-time Protection**: Intercepts and scans URLs invisibly as you navigate.
*   **Extension Dashboard**: Click the Nizhal icon to view your total scanned URLs, blocked threats, and toggle protection on or off.
*   **Dual-Layer Heuristics Engine**:
    *   **Local Vibe Check**: Instantly blocks excessively long URLs, IP-address hostnames, excessive subdomains, and suspicious TLDs (`.top`, `.xyz`, etc.) without ever hitting an API.
    *   **ML Content Analysis**: Scrapes the destination page and uses a Keyword Density algorithm (NLP) to detect urgent phishing language ("password reset", "account suspended").
*   **Machine Learning Backend**: A containerized FastAPI service running a trained Random Forest model (`phishing_model.pkl`) analyzing 14+ different URL characteristics.
*   **Threat Intelligence Integration**: Hooks into the Google Safe Browsing API yielding massive database coverage to block known threats instantly.
*   **Smart Whitelisting**: If you encounter a false positive, clicking "Proceed Unsafe" intelligently whitelists the domain so it doesn't block you again.
*   **Performance Caching**: Saves API results for 24 hours to ensure your browsing speed is never impacted by redundant checks.

## 🛠️ Architecture

Nizhal is divided into two distinct parts:
1.  **Frontend (Chrome Extension)**: Built with Manifest V3. Handles `webNavigation` interception, the popup dashboard UI, caching, and local heuristic execution.
2.  **Backend (Python API)**: A lightweight FastAPI server containing the ML model (`scikit-learn`), feature extraction, NLP scraping (`BeautifulSoup4`), and Google Safe Browsing integration.

---

## 💻 Installation

### 1. Start the Machine Learning Backend

The backend is fully containerized with Docker for easy deployment.
```bash
# Clone the repository
git clone https://github.com/thearjunl/Nizhal.git
cd Nizhal

# (Optional) Add your Google Safe Browsing API Key for maximum protection
# Edit ml/.env and add: GOOGLE_SAFE_BROWSING_API_KEY="your-key-here"

# Spin up the FastAPI backend
docker-compose up --build
```
*The server will start listening on `http://localhost:8000`.*

### 2. Load the Chrome Extension

1.  Open Chrome and navigate to `chrome://extensions/`.
2.  Enable **"Developer mode"** in the top right corner.
3.  Click **"Load unpacked"** and select the root `Nizhal` directory.
4.  Pin the Nizhal icon to your toolbar to access the dashboard!

---

## 🔒 Privacy

Nizhal respects your privacy. The primary heuristics (checking URL structure) run entirely locally in your browser. URLs are only sent to your backend server if they pass the initial local vibe check, and results are heavily cached to minimize data transmission.

## 🤝 Development

*   `manifest.json`: Extension configuration (Manifest V3).
*   `background.js`: Service worker handling navigation events, caching, and analytics logic.
*   `popup.html/js/css`: The extension ui dashboard logic.
*   `heuristics.js`: Logic for detecting suspicious URLs instantly.
*   `ml/api_server.py`: The FastAPI backend handling the ML Model, HTML NLP scraping, and Google Safe Browsing API.
