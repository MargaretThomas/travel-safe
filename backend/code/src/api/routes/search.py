from fastapi import APIRouter, Query

from src.api.routes.halo import service as halo_service
from src.api.routes.safety import service as safety_service
from src.models.search import AppSearchResponse
from src.services.search_service import SearchService

router = APIRouter(prefix="/api/v1", tags=["search"])
service = SearchService(
    safety_service=safety_service,
    halo_service=halo_service,
)


@router.get("/search", response_model=AppSearchResponse)
def search(
    q: str = Query(..., min_length=2, max_length=120),
    year: str | None = None,
    limit: int = Query(20, ge=1, le=20),
) -> AppSearchResponse:
    return service.search(q, year=year, limit=limit)
