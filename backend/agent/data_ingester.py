"""
Data Ingestion Layer — Real API feeds for Tamil Nadu zones
Replaces synthetic sin() drift with actual event data.

Sources:
  - USGS Earthquake API     (free, no key)
  - OpenWeatherMap API      (free tier, needs OWM_API_KEY in .env)
  - GDACS RSS feed          (free, no key)

Each fetcher returns a dict: { zone_id -> severity_delta }
The delta is ADDED to the zone's base severity in run_agent_cycle.
If a source is unavailable, it returns {} silently — pipeline continues.
"""

import asyncio
import logging
import math
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta
from typing import Dict

import httpx
from dotenv import load_dotenv
import os

load_dotenv()
logger = logging.getLogger(__name__)

OWM_KEY = os.getenv("OWM_API_KEY", "")

# ── Zone geography ─────────────────────────────────────────────────────────────
# Each zone has a bounding box and the hazard types it's sensitive to.
# OWM city IDs for nearest city to each zone.

ZONE_GEO = {
    "Z-01": {
        "name": "Marina Beach District",
        "lat": 13.0500, "lng": 80.2824,
        "owm_city": "Chennai,IN",
        "sensitive_to": ["Flood", "Hurricane"],
        "eq_radius_km": 80,
    },
    "Z-02": {
        "name": "Tambaram Industrial Zone",
        "lat": 12.9249, "lng": 80.1000,
        "owm_city": "Tambaram,IN",
        "sensitive_to": ["Wildfire"],
        "eq_radius_km": 60,
    },
    "Z-03": {
        "name": "Chromepet Residential",
        "lat": 12.9516, "lng": 80.1462,
        "owm_city": "Chennai,IN",
        "sensitive_to": ["Earthquake"],
        "eq_radius_km": 50,
    },
    "Z-04": {
        "name": "Kancheepuram Zone",
        "lat": 12.8342, "lng": 79.7036,
        "owm_city": "Kanchipuram,IN",
        "sensitive_to": ["Disease Outbreak", "Flood"],
        "eq_radius_km": 80,
    },
    "Z-05": {
        "name": "Mahabalipuram Coast",
        "lat": 12.6269, "lng": 80.1927,
        "owm_city": "Mahabalipuram,IN",
        "sensitive_to": ["Flood", "Hurricane"],
        "eq_radius_km": 80,
    },
    "Z-06": {
        "name": "Chengalpattu Hills",
        "lat": 12.6921, "lng": 79.9760,
        "owm_city": "Chengalpattu,IN",
        "sensitive_to": ["Landslide", "Flood"],
        "eq_radius_km": 60,
    },
    "Z-07": {
        "name": "Pallavaram Sector",
        "lat": 12.9675, "lng": 80.1491,
        "owm_city": "Chennai,IN",
        "sensitive_to": ["Hurricane", "Flood"],
        "eq_radius_km": 50,
    },
}

# ── Haversine ──────────────────────────────────────────────────────────────────

def _haversine_km(lat1, lng1, lat2, lng2) -> float:
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ── USGS Earthquake ────────────────────────────────────────────────────────────

async def fetch_usgs_earthquakes() -> Dict[str, float]:
    """
    Query USGS for M2.5+ earthquakes in Tamil Nadu bounding box (last 24h).
    Returns { zone_id: severity_delta } where delta ∝ magnitude / distance.
    """
    url = (
        "https://earthquake.usgs.gov/fdsnws/event/1/query"
        "?format=geojson&minmagnitude=2.5"
        "&minlatitude=8.0&maxlatitude=14.0"
        "&minlongitude=76.0&maxlongitude=81.0"
        f"&starttime={(datetime.now(timezone.utc) - timedelta(hours=24)).strftime('%Y-%m-%dT%H:%M:%S')}"
        "&orderby=magnitude"
    )
    deltas: Dict[str, float] = {}
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(url)
            r.raise_for_status()
            features = r.json().get("features", [])

        for feat in features:
            props = feat["properties"]
            coords = feat["geometry"]["coordinates"]
            eq_lat, eq_lng, depth_km = coords[1], coords[0], abs(coords[2])
            magnitude = props.get("mag", 0)

            for zone_id, geo in ZONE_GEO.items():
                if "Earthquake" not in geo["sensitive_to"] and magnitude < 4.5:
                    continue  # only broad impact for large quakes
                dist_km = _haversine_km(geo["lat"], geo["lng"], eq_lat, eq_lng)
                if dist_km > geo["eq_radius_km"]:
                    continue

                # Impact formula: higher magnitude, closer distance = bigger delta
                # M6 at 20km ≈ +3.0 delta; M3 at 50km ≈ +0.3 delta
                impact = (magnitude ** 2) / (dist_km + 10) * 2.5
                impact = round(min(4.0, impact), 2)
                deltas[zone_id] = max(deltas.get(zone_id, 0), impact)

        if deltas:
            logger.info(f"USGS: {len(features)} earthquakes → deltas: {deltas}")
        else:
            logger.info("USGS: no significant earthquakes in region")

    except Exception as e:
        logger.warning(f"USGS fetch failed: {e}")

    return deltas


# ── OpenWeatherMap ─────────────────────────────────────────────────────────────

async def fetch_owm_weather() -> Dict[str, float]:
    """
    Fetch current weather for each zone.
    Maps rainfall, wind speed, and weather condition codes to severity deltas.
    Requires OWM_API_KEY in .env (free tier, 60 calls/min).
    """
    if not OWM_KEY:
        logger.warning("OWM_API_KEY not set — skipping weather feed")
        return {}

    deltas: Dict[str, float] = {}
    # De-duplicate cities so we don't hit OWM rate limits
    seen_cities: Dict[str, float] = {}

    async with httpx.AsyncClient(timeout=8) as client:
        for zone_id, geo in ZONE_GEO.items():
            city = geo["owm_city"]
            if city in seen_cities:
                # Reuse result for zones sharing a city
                if seen_cities[city] > 0:
                    deltas[zone_id] = seen_cities[city]
                continue

            try:
                url = (
                    f"https://api.openweathermap.org/data/2.5/weather"
                    f"?q={city}&appid={OWM_KEY}&units=metric"
                )
                r = await client.get(url)
                r.raise_for_status()
                data = r.json()

                delta = 0.0
                rain_1h   = data.get("rain", {}).get("1h", 0)     # mm/h
                wind_ms   = data.get("wind", {}).get("speed", 0)  # m/s
                weather_id = data["weather"][0]["id"] if data.get("weather") else 800

                # Rain → flood/landslide severity
                if rain_1h > 0:
                    rain_delta = min(3.5, rain_1h * 0.18)
                    if any(h in geo["sensitive_to"] for h in ["Flood", "Landslide", "Hurricane"]):
                        delta += rain_delta

                # Wind → hurricane severity
                wind_kmh = wind_ms * 3.6
                if wind_kmh > 40 and "Hurricane" in geo["sensitive_to"]:
                    wind_delta = min(3.0, (wind_kmh - 40) * 0.05)
                    delta += wind_delta

                # Thunderstorm (2xx) / extreme rain (5xx) codes
                if 200 <= weather_id < 300:   # thunderstorm
                    delta += 1.2
                elif 500 <= weather_id < 600: # rain
                    if weather_id >= 502:      # heavy/extreme rain
                        delta += 0.8

                # High heat + dry → wildfire risk
                temp = data.get("main", {}).get("temp", 25)
                humidity = data.get("main", {}).get("humidity", 60)
                if temp > 38 and humidity < 30 and "Wildfire" in geo["sensitive_to"]:
                    delta += min(2.0, (temp - 38) * 0.15 + (30 - humidity) * 0.03)

                delta = round(min(4.0, delta), 2)
                seen_cities[city] = delta
                if delta > 0:
                    deltas[zone_id] = delta
                    logger.info(f"OWM {geo['name']}: rain={rain_1h}mm wind={wind_kmh:.0f}km/h → delta +{delta}")

            except Exception as e:
                logger.warning(f"OWM fetch failed for {city}: {e}")
                seen_cities[city] = 0

    return deltas


# ── GDACS RSS ──────────────────────────────────────────────────────────────────

async def fetch_gdacs_alerts() -> Dict[str, float]:
    """
    Parse GDACS RSS feed for active disasters near Tamil Nadu.
    GDACS alert levels: Green=1, Orange=2, Red=3.
    Returns severity deltas for affected zones.
    """
    url = "https://www.gdacs.org/xml/rss.xml"
    deltas: Dict[str, float] = {}

    # Tamil Nadu bounding box
    TN_BOUNDS = (8.0, 14.0, 76.0, 81.0)  # min_lat, max_lat, min_lng, max_lng

    ALERT_DELTA = {"Green": 0.8, "Orange": 2.0, "Red": 3.5}

    GDACS_HAZARD_MAP = {
        "EQ": "Earthquake",
        "FL": "Flood",
        "TC": "Hurricane",  # Tropical Cyclone
        "VO": "Wildfire",   # Volcano → treat as general hazard
        "DR": "Wildfire",   # Drought → wildfire risk proxy
        "WF": "Wildfire",
        "LS": "Landslide",
    }

    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            r = await client.get(url)
            r.raise_for_status()

        root = ET.fromstring(r.text)
        ns = {
            "gdacs": "http://www.gdacs.org",
            "geo":   "http://www.w3.org/2003/01/geo/wgs84_pos#",
        }

        for item in root.iter("item"):
            # Alert level
            alert_el = item.find("gdacs:alertlevel", ns)
            alert_level = alert_el.text.strip() if alert_el is not None else "Green"
            base_delta = ALERT_DELTA.get(alert_level, 0.5)

            # Event type
            etype_el = item.find("gdacs:eventtype", ns)
            etype = etype_el.text.strip() if etype_el is not None else ""
            hazard = GDACS_HAZARD_MAP.get(etype, "")

            # Coordinates
            lat_el = item.find("geo:lat", ns)
            lng_el = item.find("geo:long", ns)
            if lat_el is None or lng_el is None:
                continue

            try:
                ev_lat = float(lat_el.text)
                ev_lng = float(lng_el.text)
            except (ValueError, TypeError):
                continue

            # Only care about events within ~500km of Tamil Nadu centroid
            if not (TN_BOUNDS[0]-5 <= ev_lat <= TN_BOUNDS[1]+5 and
                    TN_BOUNDS[2]-5 <= ev_lng <= TN_BOUNDS[3]+5):
                continue

            # Apply to sensitive zones
            for zone_id, geo in ZONE_GEO.items():
                if hazard and hazard not in geo["sensitive_to"]:
                    continue
                dist_km = _haversine_km(geo["lat"], geo["lng"], ev_lat, ev_lng)
                if dist_km > 500:
                    continue

                # Attenuate by distance
                dist_factor = max(0.2, 1 - dist_km / 500)
                impact = round(base_delta * dist_factor, 2)
                deltas[zone_id] = max(deltas.get(zone_id, 0), impact)
                logger.info(f"GDACS {etype} {alert_level} @ {dist_km:.0f}km → {geo['name']} +{impact}")

    except Exception as e:
        logger.warning(f"GDACS fetch failed: {e}")

    return deltas


# ── IMD Cyclone Warnings ───────────────────────────────────────────────────────

async def fetch_imd_cyclone() -> Dict[str, float]:
    """
    Scrape IMD cyclone bulletin RSS for Bay of Bengal warnings.
    If a cyclone warning is active, coastal zones get a major severity bump.
    """
    url = "https://rsmcnewdelhi.imd.gov.in/rsmc-tropical-cyclones.php"
    deltas: Dict[str, float] = {}

    COASTAL_ZONES = ["Z-01", "Z-05"]  # Marina Beach, Mahabalipuram
    WARNING_LEVELS = {
        "cyclonic storm":         2.5,
        "severe cyclonic storm":  3.5,
        "very severe":            4.0,
        "extremely severe":       4.5,
        "super cyclonic":         5.0,
        "depression":             1.0,
        "deep depression":        1.8,
    }

    try:
        async with httpx.AsyncClient(timeout=8, follow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0"}) as client:
            r = await client.get(url)
            r.raise_for_status()
            text = r.text.lower()

        for keyword, delta in WARNING_LEVELS.items():
            if keyword in text:
                for zone_id in COASTAL_ZONES:
                    deltas[zone_id] = max(deltas.get(zone_id, 0), delta)
                logger.info(f"IMD cyclone warning '{keyword}' → coastal zones +{delta}")
                break  # take highest match

    except Exception as e:
        logger.warning(f"IMD cyclone fetch failed (non-critical): {e}")

    return deltas


# ── Master ingester ────────────────────────────────────────────────────────────

class DataIngester:
    """
    Runs all data fetchers concurrently and merges their deltas.
    Call .fetch() every agent cycle to get fresh severity adjustments.
    """

    def __init__(self):
        self._cache: Dict[str, float] = {}
        self._last_fetch: datetime = datetime.min.replace(tzinfo=timezone.utc)
        self._cache_ttl_seconds = 60  # re-fetch at most once per minute

    async def fetch(self) -> Dict[str, float]:
        """
        Returns merged { zone_id: severity_delta } from all sources.
        Uses a 60s cache so rapid agent cycles don't hammer external APIs.
        """
        now = datetime.now(timezone.utc)
        if (now - self._last_fetch).total_seconds() < self._cache_ttl_seconds:
            logger.debug("DataIngester: returning cached deltas")
            return self._cache

        logger.info("DataIngester: fetching from all sources...")

        results = await asyncio.gather(
            fetch_usgs_earthquakes(),
            fetch_owm_weather(),
            fetch_gdacs_alerts(),
            fetch_imd_cyclone(),
            return_exceptions=True,
        )

        merged: Dict[str, float] = {}
        source_names = ["USGS", "OWM", "GDACS", "IMD"]

        for name, result in zip(source_names, results):
            if isinstance(result, Exception):
                logger.warning(f"DataIngester: {name} raised {result}")
                continue
            for zone_id, delta in result.items():
                # Take the MAX delta across sources for each zone
                # (worst credible reading wins)
                merged[zone_id] = round(max(merged.get(zone_id, 0), delta), 2)

        self._cache = merged
        self._last_fetch = now
        logger.info(f"DataIngester: merged deltas = {merged}")
        return merged


# Singleton — imported by main.py
ingester = DataIngester()
