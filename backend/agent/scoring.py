"""
Risk & Priority Engine
Priority = (Human_Risk × 0.4) + (Supply_Urgency × 0.2) + (Infrastructure_Risk × 0.2) - (Accessibility × 0.2)
Zones ranked by priority × confidence
"""
from typing import List
from models import Zone


def compute_human_risk(zone: Zone) -> float:
    """Human risk composite: severity + medical + population factor"""
    pop_factor = min(zone.population_at_risk / 25000.0, 1.0)
    return (
        (zone.severity_level / 10.0) * 0.50
        + zone.medical_urgency * 0.30
        + pop_factor * 0.20
    )


def compute_priority(zone: Zone) -> dict:
    """
    Returns dict with all risk sub-scores and final priority.
    """
    human_risk = compute_human_risk(zone)
    infra_risk = zone.infrastructure_damage
    supply_urgency = zone.supply_deficit
    accessibility = 1.0 - zone.mobility_disruption
    conflict_risk = zone.conflict_intensity

    priority = (
        human_risk * 0.40
        + supply_urgency * 0.20
        + infra_risk * 0.20
        - accessibility * 0.20
    )

    # Clamp
    priority = max(0.0, min(1.0, priority))

    return {
        "priority": round(priority, 4),
        "human_risk": round(human_risk, 4),
        "infra_risk": round(infra_risk, 4),
        "supply_urgency": round(supply_urgency, 4),
        "accessibility": round(accessibility, 4),
        "conflict_risk": round(conflict_risk, 4),
    }


def rank_zones(zones: List[Zone]) -> List[Zone]:
    """Sort zones by priority × confidence descending (only verified zones ranked first)."""
    def sort_key(z: Zone):
        conf = (z.confidence or 0) / 100.0
        pri = z.priority or 0
        verified_bonus = 0.1 if z.verified else 0.0
        return -(pri * conf + verified_bonus)

    return sorted(zones, key=sort_key)
