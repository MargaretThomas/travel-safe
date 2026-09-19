import json
from pathlib import Path
from typing import Annotated, Literal

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

EmergencyServiceType = Literal[
    "healthcare",
    "police",
    "fire",
    "mountain_rescue",
]

router = APIRouter(prefix="/api/v1", tags=["emergency-services"])

_DATA_PATH = (
    Path(__file__).resolve().parents[3]
    / "data"
    / "emergency-services.json"
)


class EmergencyService(BaseModel):
    id: str
    name: str
    service_type: EmergencyServiceType
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    phone_number: str | None = None
    source_name: str
    source_url: str
    location_note: str | None = None


class EmergencyServicesResponse(BaseModel):
    region: str
    services: list[EmergencyService]


def _load_services() -> EmergencyServicesResponse:
    payload = json.loads(_DATA_PATH.read_text(encoding="utf-8"))
    return EmergencyServicesResponse(
        region=str(payload["region"]),
        services=[
            EmergencyService.model_validate(item)
            for item in payload["services"]
        ],
    )


@router.get(
    "/emergency-services",
    response_model=EmergencyServicesResponse,
)
def get_emergency_services(
    service_type: Annotated[EmergencyServiceType | None, Query()] = None,
) -> EmergencyServicesResponse:
    response = _load_services()
    if service_type is None:
        return response

    return EmergencyServicesResponse(
        region=response.region,
        services=[
            service
            for service in response.services
            if service.service_type == service_type
        ],
    )
