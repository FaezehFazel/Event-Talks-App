# BigQuery Release Notes Explorer & Tweet Composer

A sleek, responsive Single Page Application (SPA) built with Python, Flask, and Vanilla CSS/JS. This application aggregates the official Google Cloud BigQuery RSS release notes, categorizes individual updates, and provides a customized Tweet Composer with character-count logic to share release notes on X/Twitter.

## Features

- **Real-time Feed Integration**: Fetches and parses the official BigQuery Atom release feed directly from Google Cloud.
- **Granular Update Splitting**: Automatically parses consolidated daily updates (e.g. Features, Issues, Announcements) and renders them as individual, interactive cards.
- **Aesthetic Deep Space Theme**: Built with custom HSL typography (`Outfit` and `Plus Jakarta Sans`) and card structures featuring glowing borders matching the update type.
- **Instant Search & Filter**: Powerful client-side filtering by note type (Feature, Announcement, Issue, Deprecation) and live keyword search.
- **Dashboard Statistics**: Instant overview of total notes, features count, and issue counts.
- **Smart Tweet Composer**: 
  - Simulates a draft tweet preview box.
  - Automatically truncates description text, ensuring direct documentation links remain fully intact.
  - Handles real-world character limits (calculating all URLs at exactly 23 characters as per X/Twitter's shortener policy).
  - Uses X/Twitter Web Intents to securely publish tweets.

---

## Tech Stack

- **Backend**: Python 3.x, Flask (web framework)
- **Frontend**: HTML5, Vanilla CSS3 (Custom Variables, Flexbox, Grid, Glassmorphic effects), Vanilla ES6 JavaScript
- **Icons**: Lucide Icons CDN
- **Fonts**: Google Fonts (`Outfit` and `Plus Jakarta Sans`)

---

## Getting Started

### 1. Prerequisites

Make sure you have **Python 3.8+** and **pip** installed.

### 2. Clone and Setup

```bash
# Navigate to the project directory
cd bigquery-release-notes-app

# (Optional but recommended) Create and activate a virtual environment
python -m venv venv
# On Windows (PowerShell)
.\venv\Scripts\Activate.ps1
# On macOS/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Run the Application

```bash
python app.py
```

The application will start running on: `http://localhost:5000`

---

## Project Structure

```
bigquery-release-notes-app/
├── app.py                  # Flask backend (feed fetching, processing, and routing)
├── requirements.txt        # Backend dependencies
├── .gitignore              # Configured Git exclusion patterns
├── templates/
│   └── index.html          # Main HTML structure and layout
└── static/
    ├── css/
    │   └── style.css       # Deep Space custom design system styles
    └── js/
        └── app.js          # Client-side filtering, timeline logic, and tweet composer
```

---

## Development & Deployment

### Modifying the Feed URL
If you want to track another Google Cloud product feed, update the `FEED_URL` constant in [app.py](file:///C:/Users/faeze/OneDrive/Documents/Faezeh/Learning/Google-AI-Agent-Course_5Days/bigquery-release-notes-app/app.py):
```python
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
```

### Production Deployment
To deploy this application to a hosting environment (e.g. Render, Heroku, or GCP):
1. Disable debug mode in `app.py` by changing `debug=True` to `debug=False` or driving it via environment variables.
2. Use a production WSGI server such as `gunicorn` (Unix) or `waitress` (Windows) to serve the app.
