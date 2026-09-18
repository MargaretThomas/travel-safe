from fastapi import APIRouter, HTTPException

from src.api.routes.halo import service as halo_service
from src.api.routes.safety import service as safety_service
from src.models.routes import RouteAnalyseRequest, RouteAnalyseResponse
from src.services.route_safety_service import RouteSafetyService

router = APIRouter(prefix="/api/v1", tags=["route-safety"])
service = RouteSafetyService(
    safety_service=safety_service,
    halo_service=halo_service,
)


@router.post("/routes/analyse", response_model=RouteAnalyseResponse)
def analyse_routes(payload: RouteAnalyseRequest) -> RouteAnalyseResponse:
    status = safety_service.dataset_status()
    if payload.year not in status.years:
        raise HTTPException(
            status_code=404,
            detail="Requested safety-data year is not available",
        )
    return service.analyse(payload.candidates, year=payload.year)
