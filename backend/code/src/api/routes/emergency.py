from fastapi import APIRouter, Query
from pydantic import BaseModel

from src.models.emergency import EmergencyNumbersResponse
from src.providers.emergency_numbers import EmergencyNumbersProvider

router = APIRouter(prefix="/api/v1", tags=["emergency"])
provider = EmergencyNumbersProvider()


@router.get("/emergency-numbers", response_model=EmergencyNumbersResponse)
def emergency_numbers(
    service_type: str | None = Query(default=None),
) -> EmergencyNumbersResponse:
    return provider.list_numbers(service_type=service_type)


CAPE_TOWN_BBOX = (18.30, -34.36, 18.85, -33.45)


class LocationEmergencyNumber(BaseModel):
    label: str
    number: str


class LocationEmergencyNumbersResponse(BaseModel):
    in_cape_town: bool
    police: LocationEmergencyNumber
    fire: LocationEmergencyNumber
    hospital: LocationEmergencyNumber


def _in_cape_town(lat: float, lon: float) -> bool:
    west, south, east, north = CAPE_TOWN_BBOX
    return west <= lon <= east and south <= lat <= north


@router.get(
    "/emergency/numbers",
    response_model=LocationEmergencyNumbersResponse,
)
def location_emergency_numbers(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
) -> LocationEmergencyNumbersResponse:
    local = _in_cape_town(lat, lon)
    return LocationEmergencyNumbersResponse(
        in_cape_town=local,
        police=LocationEmergencyNumber(
            label="SAPS Flying Squad",
            number="10111",
        ),
        fire=LocationEmergencyNumber(
            label="National emergency number",
            number="112",
        ),
        hospital=LocationEmergencyNumber(
            label=(
                "City of Cape Town Emergency Services"
                if local
                else "Ambulance"
            ),
            number="0214807700" if local else "10177",
        ),
    )
