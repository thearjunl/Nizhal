# Nizhal

> "A stealthy, high-performance security extension that acts as a protective shadow."

Nizhal is a Chrome Extension designed to detect malicious URLs in real-time. It features a "vibe-check" heuristic module for detecting typosquatting, punycode/homographs, and suspicious subdomains.

## Features

- **Real-time Protection**: Scans URLs as you navigate.
- **Heuristic Analysis**: Detects look-alike domains and suspicious patterns.
- **Warning Shield**: Redirects users to a safe warning page when a threat is detected.
- **Privacy Focused**: Runs locally with minimal data footprint.

## Installation

1. Clone this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable "Developer mode" in the top right.
4. Click "Load unpacked" and select the extension directory.

## Development

- `manifest.json`: Extension configuration (Manifest V3).
- `background.js`: Service worker for handling navigation events.
- `heuristics.js`: Logic for detecting suspicious URLs.
- `warning.html` & `warning.css`: The warning page displayed to users.
