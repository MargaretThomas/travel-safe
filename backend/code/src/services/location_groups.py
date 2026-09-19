import secrets
import threading
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta

from src.models.location_groups import (
    CreateLocationGroupResponse,
    JoinLocationGroupResponse,
    LocationGroupSnapshot,
    MemberLocation,
)

GROUP_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
GROUP_CODE_LENGTH = 6


@dataclass
class MemberState:
    client_id: str
    display_name: str
    joined_at: datetime
    latitude: float | None = None
    longitude: float | None = None
    updated_at: datetime | None = None


@dataclass
class GroupState:
    group_code: str
    group_key: str
    created_at: datetime
    members: dict[str, MemberState] = field(default_factory=dict)


class LocationGroupStore:
    def __init__(
        self,
        *,
        stale_after_seconds: int = 120,
        polling_interval_seconds: int = 15,
    ) -> None:
        self.stale_after_seconds = stale_after_seconds
        self.polling_interval_seconds = polling_interval_seconds
        self._groups: dict[str, GroupState] = {}
        self._lock = threading.Lock()

    @staticmethod
    def _now() -> datetime:
        return datetime.now(UTC)

    def _new_code(self) -> str:
        for _ in range(50):
            code = "".join(
                secrets.choice(GROUP_CODE_ALPHABET)
                for _ in range(GROUP_CODE_LENGTH)
            )
            if code not in self._groups:
                return code
        raise RuntimeError("Unable to allocate a group code")

    def create_group(self) -> CreateLocationGroupResponse:
        with self._lock:
            group_code = self._new_code()
            group_key = secrets.token_urlsafe(24)
            created_at = self._now()
            self._groups[group_code] = GroupState(
                group_code=group_code,
                group_key=group_key,
                created_at=created_at,
            )

        return CreateLocationGroupResponse(
            group_code=group_code,
            group_key=group_key,
            created_at=created_at,
            warning=(
                "Demo-only location group. Share the group key only with trusted "
                "people. Data is stored in memory and resets when the server restarts."
            ),
        )

    def _authorized_group(
        self,
        group_code: str,
        group_key: str,
    ) -> GroupState | None:
        group = self._groups.get(group_code.upper())
        if group is None or not secrets.compare_digest(group.group_key, group_key):
            return None
        return group

    def join_group(
        self,
        group_code: str,
        group_key: str,
        client_id: str,
        display_name: str,
    ) -> JoinLocationGroupResponse | None:
        with self._lock:
            group = self._authorized_group(group_code, group_key)
            if group is None:
                return None
            joined_at = self._now()
            existing = group.members.get(client_id)
            if existing is None:
                group.members[client_id] = MemberState(
                    client_id=client_id,
                    display_name=display_name,
                    joined_at=joined_at,
                )
            else:
                existing.display_name = display_name
                joined_at = existing.joined_at

        return JoinLocationGroupResponse(
            group_code=group.group_code,
            client_id=client_id,
            display_name=display_name,
            joined_at=joined_at,
        )

    def update_location(
        self,
        group_code: str,
        group_key: str,
        client_id: str,
        latitude: float,
        longitude: float,
    ) -> MemberLocation | None:
        with self._lock:
            group = self._authorized_group(group_code, group_key)
            if group is None:
                return None
            member = group.members.get(client_id)
            if member is None:
                return None

            updated_at = self._now()
            member.latitude = latitude
            member.longitude = longitude
            member.updated_at = updated_at
            return MemberLocation(
                client_id=member.client_id,
                display_name=member.display_name,
                latitude=latitude,
                longitude=longitude,
                server_timestamp=updated_at,
                stale=False,
            )

    def snapshot(
        self,
        group_code: str,
        group_key: str,
    ) -> LocationGroupSnapshot | None:
        with self._lock:
            group = self._authorized_group(group_code, group_key)
            if group is None:
                return None
            now = self._now()
            stale_cutoff = now - timedelta(seconds=self.stale_after_seconds)
            members = [
                MemberLocation(
                    client_id=member.client_id,
                    display_name=member.display_name,
                    latitude=member.latitude,
                    longitude=member.longitude,
                    server_timestamp=member.updated_at,
                    stale=member.updated_at < stale_cutoff,
                )
                for member in group.members.values()
                if member.latitude is not None
                and member.longitude is not None
                and member.updated_at is not None
            ]

        members.sort(key=lambda item: item.display_name.lower())
        return LocationGroupSnapshot(
            group_code=group.group_code,
            members=members,
            server_timestamp=now,
            stale_after_seconds=self.stale_after_seconds,
            polling_interval_seconds=self.polling_interval_seconds,
        )
