from fastapi import APIRouter, Depends, HTTPException, Query

from src.api.routes.safety import parse_bbox
from src.core.client_identity import require_client_id
from src.models.halo import (
    Halo,
    HaloCreateRequest,
    HaloListResponse,
    HaloRatingRequest,
    HaloRatingResponse,
    HaloRatingSettingsRequest,
)
from src.services.halo_service import HaloService

router = APIRouter(prefix="/api/v1", tags=["halo"])
service = HaloService()


@router.get("/halo", response_model=HaloListResponse)
def list_halo(
    q: str | None = Query(default=None, min_length=2),
    bbox: str | None = Query(
        default=None,
        description="Optional west,south,east,north filter",
    ),
) -> HaloListResponse:
    parsed_bbox = parse_bbox(bbox) if bbox else None
    return service.list_halo(query=q, bbox=parsed_bbox)


@router.post("/halo", response_model=Halo, status_code=201)
def create_halo(
    payload: HaloCreateRequest,
    client_id: str = Depends(require_client_id),
) -> Halo:
    return service.create_halo(client_id=client_id, payload=payload)


@router.get("/halo/{halo_id}", response_model=Halo)
def get_halo(halo_id: str) -> Halo:
    halo = service.get_halo(halo_id)
    if halo is None:
        raise HTTPException(status_code=404, detail="Halo not found")
    return halo


@router.put(
    "/halo/{halo_id}/rating",
    response_model=HaloRatingResponse,
)
def rate_halo(
    halo_id: str,
    payload: HaloRatingRequest,
    client_id: str = Depends(require_client_id),
) -> HaloRatingResponse:
    result = service.rate_halo(
        halo_id=halo_id,
        client_id=client_id,
        payload=payload,
    )
    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Halo not found or rating is disabled",
        )
    return result


@router.put(
    "/halo/{halo_id}/rating-settings",
    response_model=Halo,
)
def set_halo_rating_enabled(
    halo_id: str,
    payload: HaloRatingSettingsRequest,
    client_id: str = Depends(require_client_id),
) -> Halo:
    halo = service.set_rating_enabled(
        halo_id=halo_id,
        client_id=client_id,
        enabled=payload.enabled,
    )
    if halo is None:
        raise HTTPException(
            status_code=404,
            detail="Halo not found or temporary client is not the submitter",
        )
    return halo
