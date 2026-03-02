"""
Verification & Confidence Engine
Confidence = (Source_Reliability × 0.4) + (Cross_Validation × 0.3) + (Time_Freshness × 0.2) + (Data_Consistency × 0.1)
"""
from datetime import datetime, timezone
from typing import List
from models import Zone

SOURCE_RELIABILITY = {
    "satellite": 0.95,
    "agency": 0.90,
    "sensor": 0.85,
    "citizen": 0.55,
}

CONFIDENCE_THRESHOLD = 50.0


def compute_confidence(zone: Zone, cycle: int, cross_validation_count: int = 1) -> tuple[float, bool]:
    """
    Returns (confidence_score 0-100, verified: bool)
    """
    # Source reliability weight
    source_rel = SOURCE_RELIABILITY.get(zone.source_type, 0.60)

    # Cross-validation: more sources reporting = higher confidence
    cross_val = min(0.95, 0.50 + cross_validation_count * 0.08 + cycle * 0.02)

    # Time freshness: degrades over cycles (simulates data staleness)
    time_freshness = max(0.35, 1.0 - cycle * 0.02)

    # Data consistency: check internal coherence of zone data
    # High severity should correlate with high damage/urgency
    sev_norm = zone.severity_level / 10.0
    avg_indicators = (zone.infrastructure_damage + zone.medical_urgency + zone.supply_deficit) / 3.0
    consistency_delta = abs(sev_norm - avg_indicators)
    data_consistency = max(0.0, 1.0 - consistency_delta * 0.8)

    # Weighted formula
    confidence = (
        source_rel * 0.4
        + cross_val * 0.3
        + time_freshness * 0.2
        + data_consistency * 0.1
    ) * 100.0

    confidence = round(min(99.0, max(0.0, confidence)), 1)
    verified = confidence >= CONFIDENCE_THRESHOLD

    return confidence, verified


def get_threat_label(priority: float, confidence: float) -> tuple[str, str]:
    """Returns (label, hex_color)"""
    score = priority * (confidence / 100.0)
    if score > 0.50:
        return "CRITICAL", "#ef4444"
    elif score > 0.32:
        return "HIGH", "#f97316"
    elif score > 0.16:
        return "MODERATE", "#eab308"
    else:
        return "LOW", "#22c55e"
