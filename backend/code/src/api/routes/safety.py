from fastapi import APIRouter, HTTPException, Query

from src.models.safety import (
    AreaStatsResponse,
    DatasetStatusResponse,
    DataSource,
    GoldenSpotResponse,
    HeatmapResponse,
    MapSearchResponse,
    SafetySignalResponse,
)
from src.services.safety_service import SafetyService

router = APIRouter(prefix="/api/v1", tags=["safety-intelligence"])
service = SafetyService()


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
    return service.sources()


@router.get("/dataset/status", response_model=DatasetStatusResponse)
def dataset_status() -> DatasetStatusResponse:
    return service.dataset_status()


@router.get("/stats", response_model=AreaStatsResponse)
def get_stats(
    area_code: str = Query(..., min_length=1),
    year: str | None = None,
) -> AreaStatsResponse:
    stats = service.area_stats(area_code, year=year)
    if stats is None:
        raise HTTPException(status_code=404, detail="Area data not available")
    return stats


@router.get("/heatmap", response_model=HeatmapResponse)
def get_heatmap(
    bbox: str = Query(..., description="west,south,east,north"),
    zoom: int = Query(12, ge=5, le=18),
    year: str | None = None,
    limit: int = Query(1500, ge=1, le=1500),
) -> HeatmapResponse:
    return service.heatmap(
        parse_bbox(bbox),
        zoom,
        year=year,
        limit=limit,
    )


@router.get("/map/search", response_model=MapSearchResponse)
def search_map(
    q: str = Query(..., min_length=2),
    year: str | None = None,
    limit: int = Query(20, ge=1, le=50),
) -> MapSearchResponse:
    return service.search(q, year=year, limit=limit)


@router.get("/golden-spots", response_model=GoldenSpotResponse)
def golden_spots(
    bbox: str = Query(..., description="west,south,east,north"),
    q: str | None = None,
) -> GoldenSpotResponse:
    return service.golden_spots(parse_bbox(bbox), query=q)


@router.get(
    "/areas/{area_code}/safety",
    response_model=SafetySignalResponse,
)
def get_safety_signal(
    area_code: str,
    year: str | None = None,
) -> SafetySignalResponse:
    signal = service.safety_signal(area_code, year=year)
    if signal is None:
        raise HTTPException(status_code=404, detail="Area data not available")
    return signal
