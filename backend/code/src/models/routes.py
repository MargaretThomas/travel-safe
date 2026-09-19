from typing import Literal

from pydantic import BaseModel, Field

from src.models.safety import RiskBand

RouteProfile = Literal["walking", "driving", "cycling"]
RouteContextStatus = Literal["available", "insufficient_data"]


class RouteCoordinate(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class RouteCandidate(BaseModel):
    id: str = Field(min_length=1, max_length=80)
    profile: RouteProfile = "walking"
    distance_meters: float = Field(ge=0)
    duration_seconds: float = Field(ge=0)
    coordinates: list[RouteCoordinate] = Field(min_length=2, max_length=5000)


class RouteAnalyseRequest(BaseModel):
    year: str = "2025/2026"
    candidates: list[RouteCandidate] = Field(min_length=1, max_length=3)


class RouteHaloContext(BaseModel):
    id: str
    name: str
    latitude: float
    longitude: float
    distance_from_route_meters: float = Field(ge=0)
    visitability_score: float | None = Field(default=None, ge=0, le=100)
    visitability_confidence: float = Field(ge=0, le=1)


class RouteRiskResult(BaseModel):
    id: str
    profile: RouteProfile
    distance_meters: float = Field(ge=0)
    duration_seconds: float = Field(ge=0)
    context_status: RouteContextStatus
    exposure_score: float | None = Field(default=None, ge=0, le=100)
    safety_context_score: float | None = Field(default=None, ge=0, le=100)
    exposure_band: RiskBand | None = None
    green_exposure_ratio: float = Field(ge=0, le=1)
    orange_exposure_ratio: float = Field(ge=0, le=1)
    red_exposure_ratio: float = Field(ge=0, le=1)
    max_danger_score: float | None = Field(default=None, ge=0, le=100)
    confidence: float = Field(ge=0, le=1)
    sampled_points: int = Field(ge=0)
    nearby_halo: list[RouteHaloContext] = Field(default_factory=list)


class RouteAnalyseResponse(BaseModel):
    lower_risk_route_id: str | None = None
    year: str
    model_version: str
    routes: list[RouteRiskResult]
    selection_basis: str
    caveats: list[str]
