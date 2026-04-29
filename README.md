# Race Condition Detection Tool

A web-based tool that detects race conditions in multithreaded programs using static and dynamic analysis. Built as a BTech Operating Systems project.

---

## What it does

- Analyzes thread operations and detects unsafe shared variable access
- Rates severity of race conditions (Low / Medium / High)
- Suggests synchronization fixes (Mutex, Semaphore, Monitors)
- Displays results on an interactive web dashboard

---

## Project Structure

```
Race-Condition-Detection-Tool/
├── backend/
│   ├── app.py                    # Flask entry point
│   ├── config.py                 # App configuration
│   ├── requirements.txt          # Python dependencies
│   ├── routes/                   # API route definitions
│   ├── controllers/              # Request handlers
│   ├── utils/race_detector.py    # Core detection logic
│   └── database/db.py            # JSON-based storage
└── frontend/
    ├── index.html                # Home page
    ├── analyzer.html             # Analysis tool
    ├── dashboard.html            # Results dashboard
    ├── solutions.html            # Fix suggestions
    ├── css/style.css             # Styling
    └── js/script.js              # Frontend logic
```

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/aadivmk/Race_detection_tool.git
cd Race_detection_tool
```

### 2. Run the backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

Backend runs at `http://localhost:5000`

### 3. Open the frontend

Open `frontend/index.html` in your browser.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/analyze` | Run race condition analysis |
| GET | `/api/history` | Get past analysis reports |
| GET | `/api/solutions` | Get fix recommendations |

---

## Tech Stack

- **Frontend** — HTML, CSS, JavaScript
- **Backend** — Python, Flask, Flask-CORS
- **Algorithm** — Eraser Lockset Algorithm

---

## Author

Made by [aadiv](https://github.com/aadivmk) — BTech OS Course Project
