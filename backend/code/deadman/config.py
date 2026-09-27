from __future__ import annotations

import logging
import os
import re
from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import timedelta
from pathlib import Path

logger = logging.getLogger(__name__)

ENV_FILE = Path(__file__).resolve().parents[1] / ".env"

_ASSIGNMENT = re.compile(r"^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$")


def read_env_file(path: Path | None = None) -> dict[str, str]:
    """Parse a .env file the way scripts/dev.sh parses it: read, never evaluated, so a
    value containing < or > stays a value instead of becoming a shell redirect.

    The API and the worker are started by hand as often as by `scripts/dev.sh run`, and
    from_env reads the process environment. Without this the .env is simply absent when
    uvicorn is launched directly: the app still starts, silently takes every default
    (no gateway, a different database, no email), and each of those misconfigurations
    surfaces much later as a failed alert rather than at startup.
    """
    path = path or ENV_FILE
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError:
        return {}
    values: dict[str, str] = {}
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        match = _ASSIGNMENT.match(line)
        if match is None:
            continue
        value = match.group(2).rstrip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        values[match.group(1)] = value
    return values


def _optional(env: Mapping[str, str], key: str) -> str | None:
    value = env.get(key, "").strip()
    return value or None


def _int(env: Mapping[str, str], key: str, default: int) -> int:
    raw = env.get(key, "").strip()
    return int(raw) if raw else default


@dataclass(frozen=True)
class Settings:
    db_path: str = "deadman.db"
    public_base_url: str = "http://127.0.0.1:8000"
    cors_origins: tuple[str, ...] = ()

    access_token_ttl: timedelta = timedelta(hours=1)
    refresh_token_ttl: timedelta = timedelta(days=180)

    location_retention: timedelta = timedelta(hours=24)
    emergency_link_ttl: timedelta = timedelta(days=30)
    archive_retention: timedelta = timedelta(days=90)

    notification_max_attempts: int = 3
    max_contacts_per_user: int = 10
    max_location_batch: int = 100
    worker_interval_seconds: int = 60

    resend_api_key: str | None = field(default=None, repr=False)
    resend_from_email: str | None = None

    whatsapp_bot_url: str = ""
    whatsapp_bot_token: str | None = field(default=None, repr=False)

    mapbox_public_token: str | None = None
    mapbox_server_token: str | None = field(default=None, repr=False)

    def emergency_url(self, token: str) -> str:
        return f"{self.public_base_url.rstrip('/')}/e/{token}"

    @classmethod
    def from_env(cls, env: Mapping[str, str] | None = None) -> Settings:
        if env is None:
            # Variables already exported into the process win over the file, so a
            # container or a systemd unit can override .env without editing it.
            env = {**read_env_file(), **os.environ}
            if not env.get("WHATSAPP_BOT_URL", "").strip():
                logger.warning(
                    "WHATSAPP_BOT_URL is not set (no %s, nothing in the environment): phone "
                    "notifications will fail with whatsapp_not_configured.",
                    ENV_FILE.name,
                )
        origins = tuple(
            origin.strip() for origin in env.get("DEADMAN_CORS_ORIGINS", "").split(",") if origin.strip()
        )
        return cls(
            db_path=env.get("DEADMAN_DB_PATH", "deadman.db"),
            public_base_url=env.get("DEADMAN_PUBLIC_BASE_URL", "http://127.0.0.1:8000"),
            cors_origins=origins,
            location_retention=timedelta(hours=_int(env, "DEADMAN_LOCATION_RETENTION_HOURS", 24)),
            emergency_link_ttl=timedelta(days=_int(env, "DEADMAN_EMERGENCY_LINK_TTL_DAYS", 30)),
            archive_retention=timedelta(days=_int(env, "DEADMAN_ARCHIVE_RETENTION_DAYS", 90)),
            notification_max_attempts=_int(env, "DEADMAN_NOTIFICATION_MAX_ATTEMPTS", 3),
            worker_interval_seconds=_int(env, "DEADMAN_WORKER_INTERVAL_SECONDS", 60),
            resend_api_key=_optional(env, "RESEND_API_KEY"),
            resend_from_email=_optional(env, "RESEND_FROM_EMAIL"),
            whatsapp_bot_url=env.get("WHATSAPP_BOT_URL", "").strip(),
            whatsapp_bot_token=_optional(env, "WHATSAPP_BOT_TOKEN"),
            mapbox_public_token=_optional(env, "MAPBOX_PUBLIC_TOKEN"),
            mapbox_server_token=_optional(env, "MAPBOX_SERVER_TOKEN"),
        )
