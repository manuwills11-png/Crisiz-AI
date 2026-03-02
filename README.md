🛰 Sentinel — Autonomous Crisis Operations AI Agent

✨ A real-time autonomous simulation platform that transforms crisis data into structured, actionable emergency directives using deterministic risk modeling and AI-powered strategic reasoning.

Repository: https://github.com/manuwills11-png/sentinel-crisis-ops-agent



📌 Overview

Sentinel is a crisis response simulation system built for scenarios such as hurricanes, floods, earthquakes, wildfires, and conflict zones.

It continuously:

Verifies multi-source zone data

Computes deterministic priority scores

Allocates limited resources

Simulates cascading impacts

Forecasts near-term risk trajectories

Generates structured emergency command plans via AI

Unlike traditional dashboards that only visualize data, Sentinel operationalizes it.



🧠 Core Idea

Sentinel separates decision intelligence into two distinct layers:



1️⃣ Deterministic Risk Engine

Handles:

Zone scoring

Threat classification

Confidence verification

Resource allocation

Cascade modeling

6-hour forecasting



2️⃣ AI Strategic Reasoning Layer

Handles:

Translating risk into structured command plans

Generating evacuation directives

Creating resource deployment instructions

Defining monitoring triggers

The AI does NOT compute risk.
It interprets structured risk signals.

This ensures:

Transparency

Explainability

Operational control

🧩 System Architecture
🔹 Backend — FastAPI



Autonomous agent loop

Multi-zone scoring engine

Resource pool optimization



Cascade simulation



Forecast trend generation

Structured AI command generation (Gemma via Gemini API)



Core Cycle:

Verify → Score → Rank → Allocate → Forecast → Generate Strategy → Alert



Tech Stack:

Python

FastAPI

Pydantic

Uvicorn

Gemini API (Gemma model)



🔹 Frontend — React + Vite

Real-time crisis map (Leaflet)

Dynamic zone ranking sidebar

Forecast trend visualization (Recharts)

What-if simulation controls

Structured AI strategy renderer

Autonomous cycle indicator

Resource dashboard & alerts panel



Tech Stack:

React

Vite

Leaflet

Recharts

Custom glass UI system



🔥 Example AI Output

The AI produces structured operational directives like this:

[PRIORITY COMMANDS]

Establish Incident Command Post at Central Valley.

Deploy 3 rapid response medical units east of zone boundary.

Initiate evacuation within 4km flood radius via Route 12.

[RESOURCE DIRECTIVES]

Allocate two mobile supply trucks to staging area B.

Reserve helicopter for critical medevac standby.

[EVACUATION & CIVIL CONTROL]

Redirect civilians to Westside Shelter C.

Activate emergency traffic diversion protocol.

[RISK MONITORING]

Escalate if severity exceeds 9.5.

Monitor hospital capacity below 40%.

This structure ensures rescue teams can follow directives immediately without interpretation.



⚙️ Local Setup
1️⃣ Clone Repository

git clone https://github.com/manuwills11-png/sentinel-crisis-ops-agent.git

cd sentinel-crisis-ops-agent



2️⃣ Backend Setup

cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

Create a .env file inside backend:

GEMINI_API_KEY=your_api_key_here

Run backend:

uvicorn main:app --reload --port 8000

Backend runs at:
http://localhost:8000



3️⃣ Frontend Setup

cd frontend
npm install
npm run dev

Frontend runs at:
http://localhost:5173

🧪 What-If Simulation

Operators can dynamically adjust:

Severity boost

Rainfall increase

Conflict escalation

The system recalculates forecast projections and resource strain in real time.



📊 Key Features

Real-time zone priority ranking

Threat classification (Low / Moderate / High / Critical)

Confidence scoring system

Resource allocation tracking

Cascade propagation modeling

Forecast trend simulation

Structured AI emergency directives

Autonomous cycle engine

Interactive crisis map

Simulation parameter controls



🔐 Security

.env files are excluded via .gitignore

API keys are never committed

Anyone cloning must use their own API key



🚀 Future Improvements

Multi-agent coordination

Real-time sensor ingestion

Satellite data integration

Reinforcement learning resource optimization

GIS evacuation corridor overlays

Multi-model AI validation



🛡 Disclaimer

This project is a simulation and research prototype.
It is not intended for real-world emergency deployment.



👨‍💻 Author

Martin Wills
AI Systems Engineer
GitHub: https://github.com/manuwills11-png



📜 License

MIT License