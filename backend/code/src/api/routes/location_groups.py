from fastapi import APIRouter, Header, HTTPException

from src.models.location_groups import (
    CreateLocationGroupResponse,
    JoinLocationGroupRequest,
    JoinLocationGroupResponse,
    LocationGroupSnapshot,
    LocationUpdateRequest,
    MemberLocation,
)
from src.services.location_groups import LocationGroupStore

router = APIRouter(prefix="/api/v1", tags=["trusted-contacts"])
store = LocationGroupStore()


def require_group_key(
    x_group_key: str | None = Header(default=None, alias="X-Group-Key"),
) -> str:
    if not x_group_key:
        raise HTTPException(status_code=404, detail="Location group not found")
    return x_group_key


@router.post(
    "/location-groups",
    response_model=CreateLocationGroupResponse,
)
def create_location_group() -> CreateLocationGroupResponse:
    return store.create_group()


@router.post(
    "/location-groups/{group_code}/join",
    response_model=JoinLocationGroupResponse,
)
def join_location_group(
    group_code: str,
    payload: JoinLocationGroupRequest,
    group_key: str = Header(alias="X-Group-Key"),
) -> JoinLocationGroupResponse:
    result = store.join_group(
        group_code=group_code,
        group_key=group_key,
        client_id=payload.client_id,
        display_name=payload.display_name,
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Location group not found")
    return result


@router.put(
    "/location-groups/{group_code}/members/{client_id}/location",
    response_model=MemberLocation,
)
def update_member_location(
    group_code: str,
    client_id: str,
    payload: LocationUpdateRequest,
    group_key: str = Header(alias="X-Group-Key"),
) -> MemberLocation:
    result = store.update_location(
        group_code=group_code,
        group_key=group_key,
        client_id=client_id,
        latitude=payload.latitude,
        longitude=payload.longitude,
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Location group not found")
    return result


@router.get(
    "/location-groups/{group_code}/locations",
    response_model=LocationGroupSnapshot,
)
def get_group_locations(
    group_code: str,
    group_key: str = Header(alias="X-Group-Key"),
) -> LocationGroupSnapshot:
    result = store.snapshot(group_code=group_code, group_key=group_key)
    if result is None:
        raise HTTPException(status_code=404, detail="Location group not found")
    return result
