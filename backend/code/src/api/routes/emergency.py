from fastapi import APIRouter, Query

from src.models.emergency import EmergencyNumbersResponse
from src.providers.emergency_numbers import EmergencyNumbersProvider

router = APIRouter(prefix="/api/v1", tags=["emergency"])
provider = EmergencyNumbersProvider()


@router.get("/emergency-numbers", response_model=EmergencyNumbersResponse)
def emergency_numbers(
    service_type: str | None = Query(default=None),
) -> EmergencyNumbersResponse:
    return provider.list_numbers(service_type=service_type)
