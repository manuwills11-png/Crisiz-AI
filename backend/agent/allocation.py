"""
Resource Allocation Engine
Rules-based dispatch — deterministic, no AI scoring here.
"""
import copy
from typing import List, Tuple
from models import Zone, ResourcePool


def allocate_resources(zones: List[Zone], pool: ResourcePool) -> Tuple[List[Zone], ResourcePool]:
    """
    Allocate resources in priority order (zones must already be ranked).
    Modifies zone.dispatched in place.
    Returns updated zones and remaining resource pool.
    """
    working_pool = copy.deepcopy(pool)
    updated_zones = []

    for zone in zones:
        dispatched = []

        # Only allocate to verified, sufficient-confidence zones
        if not zone.verified:
            zone.dispatched = []
            updated_zones.append(zone)
            continue

        # Rule: Low accessibility → helicopter
        if (
            zone.mobility_disruption > 0.60
            and zone.road_safety_index < 0.40
            and working_pool.helicopters["available"] > 0
        ):
            dispatched.append("Helicopter")
            working_pool.helicopters["available"] -= 1

        # Rule: Flood → boat
        if (
            zone.hazard_type in ("Flood", "Hurricane")
            and zone.mobility_disruption > 0.50
            and working_pool.boats["available"] > 0
        ):
            dispatched.append("Boat Unit")
            working_pool.boats["available"] -= 1

        # Rule: Hospital strain → medical team
        if (
            zone.hospital_status < 0.50
            and working_pool.medical_teams["available"] > 0
        ):
            dispatched.append("Medical Team")
            working_pool.medical_teams["available"] -= 1

        # Rule: High medical urgency → ambulance
        if (
            zone.medical_urgency > 0.65
            and working_pool.ambulances["available"] > 0
        ):
            dispatched.append("Ambulance")
            working_pool.ambulances["available"] -= 1

        # Rule: Supply deficit → supply truck
        if (
            zone.supply_deficit > 0.55
            and working_pool.supply_trucks["available"] > 0
        ):
            dispatched.append("Supply Truck")
            working_pool.supply_trucks["available"] -= 1

        zone.dispatched = dispatched
        updated_zones.append(zone)

    return updated_zones, working_pool


def resource_utilization_pct(pool: ResourcePool) -> dict:
    """Return utilization percentages for each resource type."""
    result = {}
    for key, val in pool.dict().items():
        total = val["total"]
        avail = val["available"]
        used = total - avail
        result[key] = {
            "total": total,
            "available": avail,
            "used": used,
            "utilization_pct": round((used / total * 100) if total > 0 else 0, 1),
        }
    return result
