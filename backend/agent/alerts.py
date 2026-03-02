"""
Automated Alert System
Fires alerts when thresholds are crossed — deterministic, no AI.
"""
import uuid
from datetime import datetime, timezone
from typing import List
from models import Zone, Shelter, AlertMessage

PRIORITY_THRESHOLD = 0.45
CONFIDENCE_THRESHOLD = 55.0


def determine_action(zone: Zone) -> str:
    """Pick the most appropriate action based on zone indicators."""
    if zone.medical_urgency > 0.75:
        return "IMMEDIATE MEDICAL EVACUATION"
    elif zone.supply_deficit > 0.70:
        return "EMERGENCY SUPPLY DROP"
    elif zone.infrastructure_damage > 0.80:
        return "STRUCTURAL SEARCH & RESCUE"
    elif zone.mobility_disruption > 0.70:
        return "AIR EXTRACTION REQUIRED"
    else:
        return "DEPLOY EMERGENCY RESPONSE TEAM"


def generate_alerts(
    zones: List[Zone],
    shelters: List[Shelter],
    max_alerts: int = 5,
) -> List[AlertMessage]:
    """
    Generate alerts for zones exceeding priority & confidence thresholds.
    Also generates shelter overflow alerts.
    """
    alerts = []

    # Zone-based alerts
    for zone in zones:
        if len(alerts) >= max_alerts:
            break

        conf = zone.confidence or 0
        pri = zone.priority or 0

        if pri >= PRIORITY_THRESHOLD and conf >= CONFIDENCE_THRESHOLD:
            alerts.append(AlertMessage(
                alert_id=str(uuid.uuid4())[:8],
                zone=zone.name,
                hazard=zone.hazard_type,
                recommended_action=determine_action(zone),
                resources_dispatched=zone.dispatched or [],
                confidence_level=round(conf, 1),
                urgency_level=zone.threat_label or "HIGH",
                threat_color=zone.threat_color or "#f97316",
                population=zone.population_at_risk,
                timestamp=datetime.now(timezone.utc),
            ))

    # Shelter overflow alerts
    for shelter in shelters:
        if len(alerts) >= max_alerts + 2:
            break
        pct = shelter.current_occupancy / shelter.capacity if shelter.capacity > 0 else 0
        if pct > 0.92:
            alerts.append(AlertMessage(
                alert_id=str(uuid.uuid4())[:8],
                zone=f"Shelter: {shelter.name}",
                hazard="Capacity Overflow",
                recommended_action=f"REDIRECT EVACUEES — {shelter.name} AT {round(pct*100)}% CAPACITY",
                resources_dispatched=[],
                confidence_level=99.0,
                urgency_level="HIGH",
                threat_color="#f97316",
                population=shelter.current_occupancy,
                timestamp=datetime.now(timezone.utc),
            ))

    return alerts
