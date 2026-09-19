import math
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime

from src.models.halo import (
    Halo,
    HaloCommunitySignal,
    HaloCreateRequest,
    HaloListResponse,
    HaloRatingRequest,
    HaloRatingResponse,
)

PROXIMITY_VERIFY_METERS = 500.0


@dataclass
class HaloState:
    id: str
    name: str
    description: str
    location_label: str
    latitude: float
    longitude: float
    created_at: datetime
    submitted_by: str | None
    source: str
    owner_client_id: str | None
    rating_enabled: bool


@dataclass
class RatingState:
    rating: int
    liked: bool
    visited: bool
    proximity_verified: bool
    updated_at: datetime


def _haversine_meters(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
) -> float:
    radius_m = 6_371_000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1)
        * math.cos(phi2)
        * math.sin(d_lambda / 2) ** 2
    )
    return 2 * radius_m * math.atan2(math.sqrt(a), math.sqrt(1 - a))


class HaloService:
    def __init__(self) -> None:
        self._halos: dict[str, HaloState] = {}
        self._ratings: dict[str, dict[str, RatingState]] = {}
        self._seed_demo_halo()

    @staticmethod
    def _now() -> datetime:
        return datetime.now(UTC)

    def _seed_demo_halo(self) -> None:
        seeds = [
            HaloState(
                id="halo-waterfront-promenade",
                name="Waterfront Promenade",
                description=(
                    "Demo Halo for a popular public waterfront destination."
                ),
                location_label="V&A Waterfront, Cape Town",
                latitude=-33.9068,
                longitude=18.4207,
                created_at=self._now(),
                submitted_by="Travel Safe demo",
                source="seeded_demo",
                owner_client_id=None,
                rating_enabled=True,
            ),
            HaloState(
                id="halo-companys-garden",
                name="Company's Garden",
                description=(
                    "Demo Halo for a central public garden and cultural stop."
                ),
                location_label="Company's Garden, Cape Town",
                latitude=-33.9254,
                longitude=18.4199,
                created_at=self._now(),
                submitted_by="Travel Safe demo",
                source="seeded_demo",
                owner_client_id=None,
                rating_enabled=True,
            ),
            HaloState(
                id="halo-muizenberg-corner",
                name="Muizenberg Surfers Corner",
                description=(
                    "Demo Halo for a well-known beachfront meeting point."
                ),
                location_label="Muizenberg, Cape Town",
                latitude=-34.1075,
                longitude=18.4689,
                created_at=self._now(),
                submitted_by="Travel Safe demo",
                source="seeded_demo",
                owner_client_id=None,
                rating_enabled=True,
            ),
        ]
        for halo in seeds:
            self._halos[halo.id] = halo
            self._ratings.setdefault(halo.id, {})

    def _community(self, halo_id: str) -> HaloCommunitySignal:
        halo = self._halos[halo_id]
        ratings = list(self._ratings.get(halo_id, {}).values())
        rating_count = len(ratings)
        rating_average = (
            round(sum(item.rating for item in ratings) / rating_count, 2)
            if rating_count
            else None
        )
        like_count = sum(1 for item in ratings if item.liked)
        visit_count = sum(1 for item in ratings if item.visited)
        verified_count = sum(
            1 for item in ratings if item.proximity_verified
        )
        visitability_score = (
            round((rating_average / 5) * 100, 1)
            if rating_average is not None
            else None
        )
        evidence_points = rating_count + verified_count
        confidence = round(min(1.0, evidence_points / 10), 2)

        return HaloCommunitySignal(
            rating_enabled=halo.rating_enabled,
            rating_average=rating_average,
            rating_count=rating_count,
            like_count=like_count,
            self_reported_visit_count=visit_count,
            proximity_verified_visit_count=verified_count,
            visitability_score=visitability_score,
            visitability_confidence=confidence,
        )

    def _public(self, state: HaloState) -> Halo:
        return Halo(
            id=state.id,
            name=state.name,
            description=state.description,
            location_label=state.location_label,
            latitude=state.latitude,
            longitude=state.longitude,
            created_at=state.created_at,
            submitted_by=state.submitted_by,
            source=state.source,
            community=self._community(state.id),
        )

    def list_halo(
        self,
        query: str | None = None,
        bbox: tuple[float, float, float, float] | None = None,
    ) -> HaloListResponse:
        needle = (query or "").strip().lower()
        values: list[Halo] = []
        for state in self._halos.values():
            if needle:
                haystack = (
                    f"{state.name} {state.description} "
                    f"{state.location_label}"
                ).lower()
                if needle not in haystack:
                    continue
            if bbox is not None:
                west, south, east, north = bbox
                if not (
                    west <= state.longitude <= east
                    and south <= state.latitude <= north
                ):
                    continue
            values.append(self._public(state))
        values.sort(key=lambda item: (item.name.lower(), item.id))
        return HaloListResponse(items=values, count=len(values))

    def get_halo(self, halo_id: str) -> Halo | None:
        state = self._halos.get(halo_id)
        return self._public(state) if state is not None else None

    def create_halo(
        self,
        client_id: str,
        payload: HaloCreateRequest,
    ) -> Halo:
        halo_id = f"halo-{secrets.token_hex(8)}"
        state = HaloState(
            id=halo_id,
            name=payload.name.strip(),
            description=payload.description.strip(),
            location_label=payload.location_label.strip(),
            latitude=payload.latitude,
            longitude=payload.longitude,
            created_at=self._now(),
            submitted_by=(
                payload.submitted_by.strip()
                if payload.submitted_by
                else None
            ),
            source="community_submission",
            owner_client_id=client_id,
            rating_enabled=payload.rating_enabled,
        )
        self._halos[halo_id] = state
        self._ratings[halo_id] = {}
        return self._public(state)

    def set_rating_enabled(
        self,
        halo_id: str,
        client_id: str,
        enabled: bool,
    ) -> Halo | None:
        state = self._halos.get(halo_id)
        if state is None:
            return None
        if (
            state.owner_client_id is None
            or state.owner_client_id != client_id
        ):
            return None
        state.rating_enabled = enabled
        return self._public(state)

    def rate_halo(
        self,
        halo_id: str,
        client_id: str,
        payload: HaloRatingRequest,
    ) -> HaloRatingResponse | None:
        state = self._halos.get(halo_id)
        if state is None or not state.rating_enabled:
            return None

        proximity_verified = False
        if (
            payload.visited
            and payload.visit_latitude is not None
            and payload.visit_longitude is not None
        ):
            proximity_verified = (
                _haversine_meters(
                    state.latitude,
                    state.longitude,
                    payload.visit_latitude,
                    payload.visit_longitude,
                )
                <= PROXIMITY_VERIFY_METERS
            )

        updated_at = self._now()
        rating = RatingState(
            rating=payload.rating,
            liked=payload.liked,
            visited=payload.visited,
            proximity_verified=proximity_verified,
            updated_at=updated_at,
        )
        self._ratings.setdefault(halo_id, {})[client_id] = rating

        return HaloRatingResponse(
            halo=self._public(state),
            client_id=client_id,
            rating=payload.rating,
            liked=payload.liked,
            visited=payload.visited,
            proximity_verified=proximity_verified,
            updated_at=updated_at,
        )
