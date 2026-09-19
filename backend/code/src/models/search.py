from typing import Literal

from pydantic import BaseModel, Field

from src.models.safety import RiskBand


class AppSearchResult(BaseModel):
    result_type: Literal["halo", "police_station"]
    id: str
    name: str
    latitude: float
    longitude: float
    subtitle: str | None = None
    color: str | None = None
    danger_score: float | None = Field(default=None, ge=0, le=100)
    safety_score: float | None = Field(default=None, ge=0, le=100)
    risk_band: RiskBand | None = None
    year: str | None = None
    visitability_score: float | None = Field(default=None, ge=0, le=100)
    rating_average: float | None = Field(default=None, ge=1, le=5)
    rating_count: int | None = Field(default=None, ge=0)
    caution: str | None = None


class AppSearchResponse(BaseModel):
    query: str
    results: list[AppSearchResult]
    count: int
    external_geocoding: str = (
        "External address/place geocoding remains the frontend map provider's "
        "responsibility; this endpoint searches Travel Safe's own data."
    )
