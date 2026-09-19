from datetime import datetime

from pydantic import BaseModel, Field


class CreateLocationGroupResponse(BaseModel):
    group_code: str = Field(min_length=6, max_length=6)
    group_key: str
    created_at: datetime
    storage: str = "memory_only"
    warning: str


class JoinLocationGroupRequest(BaseModel):
    client_id: str = Field(min_length=3, max_length=80)
    display_name: str = Field(min_length=1, max_length=80)


class JoinLocationGroupResponse(BaseModel):
    group_code: str
    client_id: str
    display_name: str
    joined_at: datetime


class LocationUpdateRequest(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class MemberLocation(BaseModel):
    client_id: str
    display_name: str
    latitude: float
    longitude: float
    server_timestamp: datetime
    stale: bool


class LocationGroupSnapshot(BaseModel):
    group_code: str
    members: list[MemberLocation]
    server_timestamp: datetime
    stale_after_seconds: int
    polling_interval_seconds: int
