"""
Cascading Effect Detection Engine
Detects and applies secondary disaster impacts automatically.
"""
from typing import List
from models import Zone

# Cascade chains: hazard_type → list of secondary effect labels
CASCADE_CHAINS = {
    "Hurricane": [
        "Flooding Risk Elevated",
        "Road Networks Compromised",
        "Hospital Load Increasing",
        "Supply Chain Disrupted",
    ],
    "Earthquake": [
        "Infrastructure Collapse Cascading",
        "Gas Line Rupture Risk",
        "Aftershock Sequence Active",
        "Medical System Overwhelmed",
    ],
    "Flood": [
        "Road Blockage Detected",
        "Disease Outbreak Risk",
        "Supply Routes Cut",
        "Shelter Overflow Imminent",
    ],
    "Wildfire": [
        "Air Quality Critical",
        "Evacuation Routes Threatened",
        "Power Grid Failure Risk",
        "Medical Surge Expected",
    ],
    "Disease Outbreak": [
        "Hospital Overload Risk",
        "Quarantine Zone Required",
        "Supply Strain Developing",
        "Secondary Spread Vector",
    ],
    "Landslide": [
        "Road Access Severed",
        "Utility Damage Detected",
        "Zone Isolation Risk",
        "Rescue Delay Projected",
    ],
    "Conflict": [
        "Medical Access Restricted",
        "Supply Convoy Risk",
        "Displacement Surge Active",
        "Safe Corridor Required",
    ],
}

# Cascade multipliers: how much each trigger adjusts other indicators
CASCADE_MULTIPLIERS = {
    "Hurricane": {
        "mobility_disruption": 0.10,
        "medical_urgency": 0.08,
        "supply_deficit": 0.12,
        "infrastructure_damage": 0.06,
    },
    "Earthquake": {
        "infrastructure_damage": 0.15,
        "medical_urgency": 0.12,
        "supply_deficit": 0.08,
    },
    "Flood": {
        "mobility_disruption": 0.12,
        "supply_deficit": 0.10,
        "medical_urgency": 0.06,
    },
    "Wildfire": {
        "mobility_disruption": 0.08,
        "medical_urgency": 0.10,
    },
}


def apply_cascade_effects(zone: Zone, cycle: int) -> Zone:
    """
    Apply secondary cascade effects based on hazard type and cycle progression.
    Returns modified zone with cascade_effects list populated.
    """
    effects = CASCADE_CHAINS.get(zone.hazard_type, [])
    multipliers = CASCADE_MULTIPLIERS.get(zone.hazard_type, {})

    # Determine how many cascade effects are active based on severity & cycle
    active_count = min(
        len(effects),
        int(zone.severity_level / 3) + (1 if cycle > 2 else 0)
    )
    active_effects = effects[:active_count]

    # Apply multipliers to zone indicators (capped at 1.0)
    cascade_factor = min(1.0, zone.severity_level / 10.0 * 0.5 + cycle * 0.03)

    for field, mult in multipliers.items():
        current = getattr(zone, field, 0.0)
        new_val = min(1.0, current + mult * cascade_factor)
        setattr(zone, field, round(new_val, 3))

    zone.cascade_effects = active_effects
    return zone


def get_cascade_chain(hazard_type: str) -> List[str]:
    """Return the full cascade chain for display."""
    return CASCADE_CHAINS.get(hazard_type, [])
