from fastapi import APIRouter, HTTPException, Query

from src.models.safety import (
    AreaStatsResponse,
    DataSource,
    HeatmapResponse,
    SafetySignalResponse,
    TripRequest,
    TripResponse,
)
from src.services.safety_service import SafetyService
from src.services.trip_service import TripService, TripValidationError

router = APIRouter(prefix="/api/v1", tags=["safety-intelligence"])
service = SafetyService()
trip_service = TripService()


def parse_bbox(raw: str) -> tuple[float, float, float, float]:
    try:
        west, south, east, north = (float(value) for value in raw.split(","))
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail="bbox must be west,south,east,north",
        ) from exc

    if west >= east or south >= north:
        raise HTTPException(
            status_code=422,
            detail="bbox must have west < east and south < north",
        )

    return west, south, east, north


@router.get("/sources", response_model=list[DataSource])
def list_sources() -> list[DataSource]:
    return service.provider.sources()


@router.get("/stats", response_model=AreaStatsResponse)
def get_stats(area_code: str = Query(..., min_length=1)) -> AreaStatsResponse:
    stats = service.area_stats(area_code)
    if stats is None:
        raise HTTPException(status_code=404, detail="Area data not available")
    return stats


@router.get("/heatmap", response_model=HeatmapResponse)
def get_heatmap(
    bbox: str = Query(..., description="west,south,east,north"),
    zoom: int = Query(12, ge=5, le=18),
) -> HeatmapResponse:
    return service.heatmap(parse_bbox(bbox), zoom)


@router.get(
    "/areas/{area_code}/safety",
    response_model=SafetySignalResponse,
)
def get_safety_signal(area_code: str) -> SafetySignalResponse:
    signal = service.safety_signal(area_code)
    if signal is None:
        raise HTTPException(status_code=404, detail="Area data not available")
    return signal


@router.post("/trips", response_model=TripResponse)
def create_trip(payload: TripRequest) -> TripResponse:
    try:
        return trip_service.plan(payload)
    except TripValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
