from typing import Literal

from pydantic import BaseModel, Field

EmergencyServiceType = Literal[
    "healthcare",
    "police",
    "fire",
    "mountain_rescue",
]


class EmergencyNumber(BaseModel):
    id: str
    service_type: EmergencyServiceType
    display_name: str
    phone_number: str = Field(pattern=r"^[0-9+ ]+$")
    coverage_label: str
    source_name: str
    source_url: str


class EmergencyNumbersResponse(BaseModel):
    region: str
    numbers: list[EmergencyNumber]
