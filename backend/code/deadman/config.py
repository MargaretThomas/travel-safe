from __future__ import annotations

import os
import re
from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import timedelta
from pathlib import Path

# Matches `KEY=value` and `export KEY=value`. The key is restricted to the characters a
# shell would accept so that a line like `DEADMAN_CORS_ORIGINS=*` or a stray `rm -rf /`
# is read as a value and never mistaken for anything else.
_ENV_ASSIGNMENT = re.compile(r"^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$")


def env_file_path() -> Path:
    """The .env that belongs to this service, i.e. backend/code/.env.

    Anchored to this file rather than the working directory so the API and the worker
    read the same one whether dev.sh started them (it cd's into backend/code) or they
    were launched by hand from the repo root.
    """
    return Path(__file__).resolve().parent.parent / ".env"


def load_env_file() -> int:
    """Copy backend/code/.env into os.environ for keys the process does not already have.

    Only dev.sh used to export this file, so starting uvicorn by hand left
    WHATSAPP_BOT_URL empty. That silently selects the unconfigured messaging provider
    and turns every test alert into a 503 reading like a broken WhatsApp gateway,
    which is a misleading thing to debug. Real environment variables still win, so a
    deploy that injects its own config is unaffected, and a missing file is not an
    error. Returns how many keys were taken, for the startup log.
    """
    try:
        lines = env_file_path().read_text(encoding="utf-8").splitlines()
    except OSError:
        return 0
    loaded = 0
    for line in lines:
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        match = _ENV_ASSIGNMENT.match(line)
        if match is None:
            continue
        value = match.group(2).strip()
        # One layer of matching quotes, so a value that is legitimately quoted for
        # spaces (`RESEND_FROM_EMAIL="Deadman Switch <alerts@example.com>"`) keeps them
        # as part of the value rather than arriving with its quotes still attached.
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        key = match.group(1)
        if key not in os.environ:
            os.environ[key] = value
            loaded += 1
    return loaded


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
            # Only the live process reads the file. A caller that passes its own mapping
            # is a test or a caller with deliberate settings, and must not have the real
            # .env bleed into them.
            load_env_file()
            env = os.environ
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
