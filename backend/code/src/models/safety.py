from typing import Literal

from pydantic import BaseModel, Field

SourceStatus = Literal["active", "reference_only", "licence_required", "planned"]
SafetyStatus = Literal["available", "insufficient_data"]


class DataSource(BaseModel):
    id: str
    name: str
    status: SourceStatus
    role: str
    url: str
    notes: str


class CrimeCategoryStat(BaseModel):
    category: str
    count: int = Field(ge=0)


class AreaStatsResponse(BaseModel):
    area_code: str
    area_name: str
    area_type: str
    period: str
    total_reported_crimes: int = Field(ge=0)
    previous_period_total: int | None = Field(default=None, ge=0)
    latest_quarter_total: int | None = Field(default=None, ge=0)
    latest_quarter_previous_year: int | None = Field(default=None, ge=0)
    top_categories: list[CrimeCategoryStat]
    source_id: str
    source_url: str
    data_resolution: str
    caveats: list[str]


class HeatmapCell(BaseModel):
    id: str
    latitude: float
    longitude: float
    label: str
    reported_crimes: int = Field(ge=0)
    relative_intensity: float = Field(ge=0, le=1)
    resolution: str
    source_id: str


class HeatmapResponse(BaseModel):
    bbox: tuple[float, float, float, float]
    zoom: int
    cells: list[HeatmapCell]
    normalization: str
    caveats: list[str]


class SafetySignalResponse(BaseModel):
    area_code: str
    area_name: str
    status: SafetyStatus
    score: float | None = Field(default=None, ge=0, le=100)
    confidence: float = Field(ge=0, le=1)
    period: str | None = None
    explanation: list[str]
    source_ids: list[str]


TripProfile = Literal["walking", "driving"]
PathwayProvider = Literal["mapbox", "mock"]


class TripPoint(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    label: str | None = None


class TripRequest(BaseModel):
    origin: TripPoint
    destination: TripPoint
    profile: TripProfile = "walking"


class Pathway(BaseModel):
    coordinates: list[tuple[float, float]] = Field(min_length=2)
    distance_meters: float = Field(ge=0)
    duration_seconds: float = Field(ge=0)
    provider: PathwayProvider


class TripResponse(BaseModel):
    origin: TripPoint
    destination: TripPoint
    pathway: Pathway
    heatmap: HeatmapResponse
