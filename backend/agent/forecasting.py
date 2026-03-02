"""
Forecasting Engine
Projects 6-hour scenario evolution based on current trends.
"""
import math
from typing import List
from models import Zone, Shelter, ResourcePool, ForecastPoint


def generate_forecast(
    zones: List[Zone],
    shelters: List[Shelter],
    pool: ResourcePool,
    simulation_params: dict = None,
) -> List[ForecastPoint]:
    """
    Generate 6 hourly forecast points based on current state.
    Uses simple growth models — no AI involvement.
    """
    sim = simulation_params or {}
    severity_boost = sim.get("severity_boost", 0)
    rainfall = sim.get("rainfall_increase", 0)
    conflict_esc = sim.get("conflict_escalation", 0)

    # Base metrics from current state
    avg_severity = sum(z.severity_level for z in zones) / len(zones) if zones else 5.0
    avg_infra = sum(z.infrastructure_damage for z in zones) / len(zones) if zones else 0.5

    total_res = sum(v["available"] for v in pool.dict().values())
    total_res_max = sum(v["total"] for v in pool.dict().values())

    total_occ = sum(s.current_occupancy for s in shelters)
    total_cap = sum(s.capacity for s in shelters) if shelters else 1

    points = []

    for hour in range(1, 7):
        # Severity growth: logistic curve toward ceiling
        sev_growth_rate = 0.08 + rainfall * 0.06 + conflict_esc * 0.04 + severity_boost * 0.02
        proj_severity = min(10.0, avg_severity * (1 + sev_growth_rate * hour))

        # Infrastructure decay: accelerates with high severity
        decay_rate = 0.025 + (avg_severity / 10.0) * 0.04
        proj_infra = min(1.0, avg_infra + decay_rate * hour)

        # Resource depletion: linear with utilization
        depletion_rate = max(0, (total_res_max - total_res) / total_res_max) * 0.5
        proj_res = max(0, int(total_res * (1 - depletion_rate * hour * 0.1)))

        # Shelter occupancy growth
        occ_growth = 0.03 + (proj_severity / 10.0) * 0.05
        proj_occ_pct = min(1.0, (total_occ / total_cap) + occ_growth * hour)

        points.append(ForecastPoint(
            hour=hour,
            severity=round(proj_severity, 2),
            infrastructure_damage=round(proj_infra, 3),
            resources_available=proj_res,
            shelter_occupancy_pct=round(proj_occ_pct, 3),
        ))

    return points
