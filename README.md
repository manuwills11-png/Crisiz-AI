# Autonomous AI Crisis Operations Agent

A production-grade, full-stack autonomous humanitarian crisis coordination system.

---

## Architecture

```
crisis-agent/
├── backend/               # FastAPI Python backend
│   ├── main.py            # App entry + AI agent loop (30s cycle)
│   ├── models.py          # Pydantic schemas (Zone, Shelter, Alert, etc.)
│   ├── requirements.txt
│   └── agent/
│       ├── verification.py   # Confidence scoring engine
│       ├── scoring.py        # Priority & risk engine
│       ├── allocation.py     # Resource allocation engine
│       ├── cascade.py        # Cascading effects detection
│       ├── forecasting.py    # 6-hour forecast engine
│       ├── alerts.py         # Automated alert generation
│       └── gemini_strategy.py  # Gemini/Claude AI reasoning
│
└── frontend/              # React + Vite frontend
    ├── src/
    │   ├── App.jsx            # Root component, state wiring
    │   ├── api.js             # Axios API service layer
    │   ├── hooks/
    │   │   └── useAgentState.js  # Polling hook (6s interval)
    │   └── components/
    │       ├── Header.jsx
    │       ├── Ticker.jsx
    │       ├── Sidebar.jsx
    │       ├── CrisisMap.jsx     # Leaflet map with all markers
    │       ├── Dashboard.jsx
    │       ├── AlertsTab.jsx
    │       ├── TrendsTab.jsx     # Recharts + what-if controls
    │       ├── StrategyTab.jsx
    │       └── LogsTab.jsx
    └── vite.config.js
```

---

## Quick Start

### 1. Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Optional: set API key (falls back to Claude if not set)
export GEMINI_API_KEY=your_key_here

# Run backend (auto-starts agent loop on startup)
uvicorn main:app --reload --port 8000
```

Backend API available at: `http://localhost:8000`
Interactive docs: `http://localhost:8000/docs`

### 2. Frontend

```bash
cd frontend

npm install
npm run dev
```

Frontend available at: `http://localhost:5173`

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/state` | Full agent state (all data) |
| GET | `/zones` | Zone list with scores |
| GET | `/alerts` | Active alerts |
| GET | `/strategy` | Current AI strategy |
| GET | `/forecast` | 6-hour forecast |
| GET | `/resources` | Resource pool + utilization |
| GET | `/shelters` | Shelter status |
| GET | `/logs` | Decision audit log |
| POST | `/citizen-ping` | Submit citizen SOS ping |
| POST | `/simulate` | Update simulation parameters |
| POST | `/strategy/regenerate` | Trigger new strategy generation |
| GET | `/health` | Agent health check |

---

## Scoring Formulas (Deterministic — No AI)

### Confidence
```
Confidence = (Source_Reliability × 0.4)
           + (Cross_Validation × 0.3)
           + (Time_Freshness × 0.2)
           + (Data_Consistency × 0.1)
```

### Priority
```
Priority = (Human_Risk × 0.4)
         + (Supply_Urgency × 0.2)
         + (Infrastructure_Risk × 0.2)
         - (Accessibility × 0.2)
```

Zones ranked by: `priority × confidence`

---

## AI Reasoning (Gemini / Claude)

The AI receives structured JSON with pre-computed scores and **only explains decisions** in natural language. It never recomputes scores or suggests different prioritization.

Fallback chain: Gemini → Claude API → Offline deterministic text

---

## Design Principles

- **Hazard-agnostic**: Works for any disaster type
- **Deterministic core**: All scoring is formula-based
- **Verified-first**: Low-confidence signals are monitored but not acted on
- **Civilian humanitarian only**: No military logic
- **Explainable**: Every decision is logged and AI-explained
