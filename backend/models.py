from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime


class Zone(BaseModel):
    zone_id: str
    name: str
    lat: float
    lng: float
    hazard_type: str
    severity_level: float = Field(ge=0, le=10)
    population_at_risk: int
    infrastructure_damage: float = Field(ge=0, le=1)
    mobility_disruption: float = Field(ge=0, le=1)
    medical_urgency: float = Field(ge=0, le=1)
    supply_deficit: float = Field(ge=0, le=1)
    conflict_intensity: float = Field(ge=0, le=1)
    road_safety_index: float = Field(ge=0, le=1)
    hospital_status: float = Field(ge=0, le=1)
    source_type: Literal["sensor", "citizen", "agency", "satellite"]
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    # Computed fields (set by engine)
    confidence: Optional[float] = None
    verified: Optional[bool] = None
    priority: Optional[float] = None
    human_risk: Optional[float] = None
    infra_risk: Optional[float] = None
    supply_urgency: Optional[float] = None
    threat_label: Optional[str] = None
    threat_color: Optional[str] = None
    dispatched: Optional[List[str]] = []
    cascade_effects: Optional[List[str]] = []


class CitizenPing(BaseModel):
    user_id: str
    latitude: float
    longitude: float
    injury_severity: float = Field(ge=0, le=1)
    people_count: int
    signal_strength: float = Field(ge=0, le=1)
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class Shelter(BaseModel):
    shelter_id: str
    name: str
    lat: float
    lng: float
    capacity: int
    current_occupancy: int
    medical_support: bool
    food_supply_level: float = Field(ge=0, le=1)

    @property
    def occupancy_pct(self) -> float:
        return self.current_occupancy / self.capacity if self.capacity > 0 else 0


class ResourcePool(BaseModel):
    helicopters: dict = {"total": 6, "available": 6}
    boats: dict = {"total": 4, "available": 4}
    ambulances: dict = {"total": 12, "available": 12}
    medical_teams: dict = {"total": 8, "available": 8}
    supply_trucks: dict = {"total": 10, "available": 10}


class AlertMessage(BaseModel):
    alert_id: str
    zone: str
    hazard: str
    recommended_action: str
    resources_dispatched: List[str]
    confidence_level: float
    urgency_level: str
    threat_color: str
    population: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ForecastPoint(BaseModel):
    hour: int
    severity: float
    infrastructure_damage: float
    resources_available: int
    shelter_occupancy_pct: float


class SimulationParams(BaseModel):
    severity_boost: float = Field(default=0, ge=0, le=5)
    rainfall_increase: float = Field(default=0, ge=0, le=1)
    conflict_escalation: float = Field(default=0, ge=0, le=1)


class AgentState(BaseModel):
    cycle: int
    last_run: datetime
    zones: List[Zone]
    alerts: List[AlertMessage]
    resources: ResourcePool
    shelters: List[Shelter]
    forecast: List[ForecastPoint]
    strategy: str
    citizen_pings: List[CitizenPing]
    simulation_params: SimulationParams
