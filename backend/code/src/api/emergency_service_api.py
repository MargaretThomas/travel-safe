from fastapi import APIRouter, Query
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/emergency", tags=["emergency-services"])

# Rough City of Cape Town metro bounding box: west, south, east, north.
CAPE_TOWN_BBOX = (18.30, -34.36, 18.85, -33.45)


class EmergencyNumber(BaseModel):
    label: str
    number: str


class EmergencyNumbersResponse(BaseModel):
    in_cape_town: bool
    police: EmergencyNumber
    fire: EmergencyNumber
    hospital: EmergencyNumber


def in_cape_town(lat: float, lon: float) -> bool:
    west, south, east, north = CAPE_TOWN_BBOX
    return west <= lon <= east and south <= lat <= north


@router.get("/numbers", response_model=EmergencyNumbersResponse)
def get_numbers(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
) -> EmergencyNumbersResponse:
    local = in_cape_town(lat, lon)
    hospital = (
        EmergencyNumber(label="City of Cape Town Emergency Services", number="021 480 7700")
        if local
        else EmergencyNumber(label="Ambulance", number="10177")
    )

    return EmergencyNumbersResponse(
        in_cape_town=local,
        police=EmergencyNumber(label="SAPS Flying Squad", number="10111"),
        fire=EmergencyNumber(label="National emergency number", number="112"),
        hospital=hospital,
    )

""" takes the phone's live location, checks whether it's inside Cape Town, 
and returns the number for each icon: police (10111) and fire (112) are always the same, 
hospital is the Cape Town number (021 480 7700) or the national ambulance number (10177) elsewhere.
"""