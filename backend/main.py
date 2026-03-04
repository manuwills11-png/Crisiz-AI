"""
Autonomous AI Crisis Operations Agent — FastAPI Backend
Continuous AI agent loop: Verify → Score → Allocate → Forecast → Strategy → Alerts
Strategy only regenerates when threat level changes — conserves API calls.
"""

import asyncio
import math
import logging
from datetime import datetime, timezone
import uvicorn

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from models import (
    Zone, CitizenPing, Shelter, ResourcePool,
    SimulationParams
)

from agent.verification import compute_confidence, get_threat_label
from agent.scoring import compute_priority, rank_zones
from agent.allocation import allocate_resources, resource_utilization_pct
from agent.cascade import apply_cascade_effects
from agent.forecasting import generate_forecast
from agent.alerts import generate_alerts
from agent.grok_strategy import generate_strategy
from agent.data_ingester import ingester


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Crisis Operations Agent", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────
# INITIAL DATA — Chennai / Tamil Nadu zones
# ─────────────────────────────────────────────────────────

INITIAL_ZONES_DATA = [
    {"zone_id": "Z-01", "name": "Marina Beach District",    "lat": 13.0500, "lng": 80.2824, "hazard_type": "Flood",           "severity_level": 7.2, "population_at_risk": 45000, "infrastructure_damage": 0.60, "mobility_disruption": 0.75, "medical_urgency": 0.55, "supply_deficit": 0.65, "conflict_intensity": 0.00, "road_safety_index": 0.30, "hospital_status": 0.60, "source_type": "satellite"},
    {"zone_id": "Z-02", "name": "Tambaram Industrial Zone", "lat": 12.9249, "lng": 80.1000, "hazard_type": "Wildfire",         "severity_level": 8.5, "population_at_risk": 28000, "infrastructure_damage": 0.75, "mobility_disruption": 0.55, "medical_urgency": 0.70, "supply_deficit": 0.50, "conflict_intensity": 0.00, "road_safety_index": 0.40, "hospital_status": 0.55, "source_type": "sensor"},
    {"zone_id": "Z-03", "name": "Chromepet Residential",    "lat": 12.9516, "lng": 80.1462, "hazard_type": "Earthquake",       "severity_level": 5.8, "population_at_risk": 62000, "infrastructure_damage": 0.45, "mobility_disruption": 0.50, "medical_urgency": 0.60, "supply_deficit": 0.40, "conflict_intensity": 0.00, "road_safety_index": 0.55, "hospital_status": 0.75, "source_type": "sensor"},
    {"zone_id": "Z-04", "name": "Kancheepuram Zone",        "lat": 12.8342, "lng": 79.7036, "hazard_type": "Disease Outbreak", "severity_level": 9.1, "population_at_risk": 35000, "infrastructure_damage": 0.30, "mobility_disruption": 0.45, "medical_urgency": 0.95, "supply_deficit": 0.80, "conflict_intensity": 0.00, "road_safety_index": 0.60, "hospital_status": 0.25, "source_type": "agency"},
    {"zone_id": "Z-05", "name": "Mahabalipuram Coast",      "lat": 12.6269, "lng": 80.1927, "hazard_type": "Flood",           "severity_level": 6.4, "population_at_risk": 18000, "infrastructure_damage": 0.55, "mobility_disruption": 0.70, "medical_urgency": 0.45, "supply_deficit": 0.60, "conflict_intensity": 0.00, "road_safety_index": 0.35, "hospital_status": 0.65, "source_type": "satellite"},
    {"zone_id": "Z-06", "name": "Chengalpattu Hills",       "lat": 12.6921, "lng": 79.9760, "hazard_type": "Landslide",        "severity_level": 4.2, "population_at_risk": 12000, "infrastructure_damage": 0.40, "mobility_disruption": 0.65, "medical_urgency": 0.35, "supply_deficit": 0.30, "conflict_intensity": 0.00, "road_safety_index": 0.45, "hospital_status": 0.70, "source_type": "citizen"},
    {"zone_id": "Z-07", "name": "Pallavaram Sector",        "lat": 12.9675, "lng": 80.1491, "hazard_type": "Hurricane",        "severity_level": 7.8, "population_at_risk": 41000, "infrastructure_damage": 0.70, "mobility_disruption": 0.65, "medical_urgency": 0.75, "supply_deficit": 0.55, "conflict_intensity": 0.00, "road_safety_index": 0.35, "hospital_status": 0.50, "source_type": "agency"},
]

# ─────────────────────────────────────────────────────────
# GLOBAL STATE
# ─────────────────────────────────────────────────────────

agent_state = {
    "cycle": 0,
    "last_run": datetime.now(timezone.utc).isoformat(),
    "zones": [],
    "alerts": [],
    "forecast": [],
    "resources": {},
    "strategy": "",
    "ai_log": [],          # AI commentary — what the AI decided each cycle
    "ai_dispatches": [],   # Which resources AI auto-dispatched this cycle
}

agent_running    = False
_last_top_threat = None   # Track threat level of top zone — only call Groq when it changes
_strategy_lock   = asyncio.Lock()  # Prevent overlapping Groq calls

# ─────────────────────────────────────────────────────────
# AI COMMENTARY — rules-based, no API, runs every cycle
# ─────────────────────────────────────────────────────────

def build_ai_commentary(zones, dispatches, cycle):
    """
    Generate human-readable AI decision log entries for this cycle.
    Purely rule-based — no API call. Explains WHY resources were dispatched.
    """
    log = []
    t = datetime.now(timezone.utc).strftime("%H:%M:%S")

    for zone in zones[:3]:  # Top 3 priority zones
        if not zone.dispatched:
            continue
        reasons = []
        if zone.mobility_disruption > 0.60 and zone.road_safety_index < 0.40:
            reasons.append(f"mobility disruption {round(zone.mobility_disruption*100)}%")
        if zone.medical_urgency > 0.65:
            reasons.append(f"medical urgency {round(zone.medical_urgency*100)}%")
        if zone.supply_deficit > 0.55:
            reasons.append(f"supply deficit {round(zone.supply_deficit*100)}%")
        if zone.hospital_status < 0.50:
            reasons.append(f"hospital at {round(zone.hospital_status*100)}% capacity")

        units = ", ".join(zone.dispatched)
        reason_str = " · ".join(reasons) if reasons else "elevated threat level"
        log.append(f"[{t}] 🤖 AI → {units} to {zone.name} — {reason_str} — SEV {round(zone.severity_level,1)} {zone.threat_label}")

    # Warn about critical zones with no dispatch
    for zone in zones:
        if zone.threat_label == "CRITICAL" and not zone.dispatched:
            log.append(f"[{t}] ⚠ AI — {zone.name} CRITICAL but no resources available — request resupply")

    if not log:
        log.append(f"[{t}] 🤖 AI — Cycle {cycle} complete. All zones monitored. No new dispatches required.")

    return log

# ─────────────────────────────────────────────────────────
# STRATEGY — only calls Groq when top zone threat changes
# ─────────────────────────────────────────────────────────

async def maybe_update_strategy(zones, force=False):
    """
    Call Groq only when:
    - forced (manual regenerate button)
    - top zone threat label changed since last call
    - strategy is empty (first run)
    This keeps API usage minimal.
    """
    global _last_top_threat

    if not zones:
        return

    top = zones[0]
    current_threat = f"{top['name']}-{top['threat_label']}"

    if not force and agent_state["strategy"] and current_threat == _last_top_threat:
        return  # Nothing changed — skip API call

    async with _strategy_lock:
        try:
            state_for_ai = {
                "zone_name":  top["name"],
                "priority":   round(top["priority"], 3),
                "confidence": round(top["confidence"], 2),
                "threat":     top["threat_label"],
                "all_zones": [
                    {
                        "name":              z["name"],
                        "hazard_type":       z["hazard_type"],
                        "severity_level":    round(z["severity_level"], 1),
                        "threat_label":      z["threat_label"],
                        "population_at_risk": z.get("population_at_risk", 0),
                        "confidence":        round(z.get("confidence", 0), 1),
                    }
                    for z in zones
                    if z.get("threat_label") in ("CRITICAL", "HIGH", "MODERATE")
                ],
            }
            t = datetime.now(timezone.utc).strftime("%H:%M:%S")
            zone_summary = ", ".join(f"{z['name']} ({z['threat_label']})" for z in zones[:3])
            agent_state["ai_log"] = [f"[{t}] 🤖 AI — Generating strategy covering: {zone_summary}..."] + agent_state["ai_log"]

            strategy = await asyncio.to_thread(generate_strategy, state_for_ai)
            agent_state["strategy"] = strategy
            _last_top_threat = current_threat

            agent_state["ai_log"] = [f"[{t}] ✓ AI — Strategy updated for {top['name']}"] + agent_state["ai_log"]
            logger.info(f"Strategy updated for {top['name']} ({top['threat_label']})")

        except Exception as e:
            logger.error(f"Strategy generation failed: {e}")
            t = datetime.now(timezone.utc).strftime("%H:%M:%S")
            agent_state["ai_log"] = [f"[{t}] ✗ AI — Strategy error: {str(e)[:60]}"] + agent_state["ai_log"]
            if not agent_state["strategy"]:
                agent_state["strategy"] = "Fallback operational plan activated. Manual command required."

# ─────────────────────────────────────────────────────────
# AGENT CYCLE
# ─────────────────────────────────────────────────────────

def _delta_source(zone_id: str, real_deltas: dict) -> str:
    """Map the highest-delta source back to a source_type string."""
    # In future this can track which API produced the delta per zone.
    # For now: any real delta = agency-level reliability.
    return "agency"


async def run_agent_cycle():
    global agent_state

    cycle = agent_state["cycle"] + 1
    logger.info(f"Agent cycle {cycle} starting...")

    # ── Fetch real-world severity deltas ──────────────────────────────────────
    # DataIngester polls USGS, OpenWeatherMap, GDACS, IMD concurrently.
    # Returns { zone_id: delta } — 0.0 when no active event detected.
    # Cached for 60s so rapid cycles don't hammer external APIs.
    real_deltas = await ingester.fetch()

    zones = []
    for zd in INITIAL_ZONES_DATA:
        z = Zone(**zd)

        # Apply real-world delta on top of base severity
        real_delta = real_deltas.get(z.zone_id, 0.0)

        if real_delta > 0:
            # Real event detected — use it directly
            z.severity_level = min(10.0, max(1.0, z.severity_level + real_delta))
            z.source_type = _delta_source(z.zone_id, real_deltas)
            z._liveData = True   # flag for frontend LIVE badge
        else:
            # No live event — apply a small realistic drift so UI stays dynamic
            # Drift is slow (±0.15 max) and mean-reverts toward base severity
            base = zd["severity_level"]
            current = agent_state.get("_sev_state", {}).get(z.zone_id, base)
            drift = math.sin(cycle * 0.3 + hash(z.zone_id) % 10) * 0.12
            mean_revert = (base - current) * 0.05
            current = min(10.0, max(1.0, current + drift + mean_revert))
            z.severity_level = round(current, 2)
            # Persist per-zone severity between cycles
            if "_sev_state" not in agent_state:
                agent_state["_sev_state"] = {}
            agent_state["_sev_state"][z.zone_id] = current

        z.infrastructure_damage = min(1.0, z.infrastructure_damage + cycle * 0.003)
        zones.append(z)

    # Pipeline: cascade → confidence → priority → rank → threat label
    zones = [apply_cascade_effects(z, cycle) for z in zones]

    for z in zones:
        conf, verified = compute_confidence(z, cycle, 2)
        z.confidence = conf
        z.verified = verified

    for z in zones:
        scores = compute_priority(z)
        z.priority = scores["priority"]

    zones = rank_zones(zones)

    for z in zones:
        label, color = get_threat_label(z.priority, z.confidence)
        z.threat_label = label
        z.threat_color = color

    # AI auto-dispatch — rules engine allocates resources each cycle
    pool = ResourcePool()
    zones, pool = allocate_resources(zones, pool)
    util = resource_utilization_pct(pool)

    # Forecast & Alerts
    forecast = generate_forecast(zones, [], pool, {})
    alerts   = generate_alerts(zones, [])

    # Build AI commentary for this cycle
    zones_dict = []
    for z in zones:
        zd = z.dict()
        zd["_liveData"] = getattr(z, "_liveData", False)
        zd["_realDelta"] = real_deltas.get(z.zone_id, 0.0)
        zones_dict.append(zd)
    ai_commentary = build_ai_commentary(zones, pool, cycle)

    # Keep last 50 log entries
    combined_log = ai_commentary + agent_state.get("ai_log", [])
    combined_log = combined_log[:50]

    # Update state
    agent_state.update({
        "cycle":        cycle,
        "last_run":     datetime.now(timezone.utc).isoformat(),
        "zones":        zones_dict,
        "alerts":       [a.dict() for a in alerts],
        "forecast":     [f.dict() for f in forecast],
        "resources":    util,
        "ai_log":       combined_log,
        "real_deltas":  real_deltas,   # expose to frontend for data source badges
        "ai_dispatches": [
            {"zone": z["name"], "units": z["dispatched"], "threat": z["threat_label"]}
            for z in zones_dict if z.get("dispatched")
        ],
    })

    logger.info(f"Cycle {cycle} complete — {len(alerts)} alerts, {sum(len(z.dispatched) for z in zones)} units dispatched.")

    # Trigger strategy update in background — only calls Groq if threat changed
    asyncio.create_task(maybe_update_strategy(zones_dict))

# ─────────────────────────────────────────────────────────
# AGENT LOOP — runs every 30s
# ─────────────────────────────────────────────────────────

async def agent_loop():
    global agent_running
    agent_running = True
    logger.info("AI Agent loop started — cycle every 30s.")

    while agent_running:
        try:
            await run_agent_cycle()
        except Exception as e:
            logger.error(f"Agent cycle error: {e}")
        await asyncio.sleep(30)


@app.on_event("startup")
async def startup_event():
    await run_agent_cycle()
    asyncio.create_task(agent_loop())
    logger.info("Autonomous agent started.")


@app.on_event("shutdown")
async def shutdown_event():
    global agent_running
    agent_running = False

# ─────────────────────────────────────────────────────────
# API ENDPOINTS
# ─────────────────────────────────────────────────────────

@app.get("/state")
async def get_state():
    return agent_state


@app.get("/strategy")
async def get_strategy():
    return {"strategy": agent_state["strategy"]}


@app.get("/ai-log")
async def get_ai_log():
    return {"log": agent_state["ai_log"]}


@app.get("/health")
async def health():
    return {
        "status":        "operational",
        "cycle":         agent_state["cycle"],
        "agent_running": agent_running,
        "last_run":      agent_state["last_run"],
    }


@app.get("/data-feeds")
async def data_feeds():
    """Debug endpoint — shows what each real data source last returned."""
    from agent.data_ingester import ingester, fetch_usgs_earthquakes, fetch_owm_weather, fetch_gdacs_alerts, fetch_imd_cyclone
    import asyncio
    results = await asyncio.gather(
        fetch_usgs_earthquakes(),
        fetch_owm_weather(),
        fetch_gdacs_alerts(),
        fetch_imd_cyclone(),
        return_exceptions=True,
    )
    names = ["usgs_earthquakes", "owm_weather", "gdacs_alerts", "imd_cyclone"]
    return {
        name: (str(r) if isinstance(r, Exception) else r)
        for name, r in zip(names, results)
    }


@app.post("/strategy/regenerate")
async def regenerate_strategy():
    """Manual trigger — forces Groq call regardless of threat change."""
    asyncio.create_task(maybe_update_strategy(agent_state["zones"], force=True))
    return {"status": "generating"}


@app.post("/dispatch/manual")
async def manual_dispatch(payload: dict):
    """
    Manual dispatch endpoint — frontend can call this to log a manual override.
    Body: { "zone_id": "Z-01", "unit": "Helicopter", "operator": "human" }
    """
    t = datetime.now(timezone.utc).strftime("%H:%M:%S")
    entry = f"[{t}] 👤 MANUAL → {payload.get('unit','Unit')} to {payload.get('zone_id','unknown')} — operator override"
    agent_state["ai_log"] = [entry] + agent_state["ai_log"]
    agent_state["ai_log"] = agent_state["ai_log"][:50]
    return {"status": "logged", "entry": entry}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
