from datetime import datetime

from pydantic import BaseModel, Field, model_validator


class HaloCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str = Field(min_length=5, max_length=500)
    location_label: str = Field(min_length=2, max_length=160)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    submitted_by: str | None = Field(default=None, max_length=80)
    rating_enabled: bool = True


class HaloRatingRequest(BaseModel):
    rating: int = Field(ge=1, le=5)
    liked: bool = False
    visited: bool = False
    visit_latitude: float | None = Field(default=None, ge=-90, le=90)
    visit_longitude: float | None = Field(default=None, ge=-180, le=180)

    @model_validator(mode="after")
    def coordinates_are_paired(self) -> "HaloRatingRequest":
        if (self.visit_latitude is None) != (self.visit_longitude is None):
            raise ValueError(
                "visit_latitude and visit_longitude must be supplied together"
            )
        return self


class HaloCommunitySignal(BaseModel):
    rating_enabled: bool
    rating_average: float | None = Field(default=None, ge=1, le=5)
    rating_count: int = Field(ge=0)
    like_count: int = Field(ge=0)
    self_reported_visit_count: int = Field(ge=0)
    proximity_verified_visit_count: int = Field(ge=0)
    visitability_score: float | None = Field(default=None, ge=0, le=100)
    visitability_confidence: float = Field(ge=0, le=1)


class Halo(BaseModel):
    id: str
    name: str
    description: str
    location_label: str
    latitude: float
    longitude: float
    created_at: datetime
    submitted_by: str | None = None
    source: str
    community: HaloCommunitySignal
    caution: str = (
        "Halo visitability is community feedback and does not change the "
        "area danger or safety score."
    )


class HaloListResponse(BaseModel):
    items: list[Halo]
    count: int


class HaloRatingResponse(BaseModel):
    halo: Halo
    client_id: str
    rating: int
    liked: bool
    visited: bool
    proximity_verified: bool
    updated_at: datetime



class HaloRatingSettingsRequest(BaseModel):
    enabled: bool
