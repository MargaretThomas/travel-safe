from __future__ import annotations

import logging
import re

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from deadman.api import public, routes
from deadman.config import Settings
from deadman.db import connect
from deadman.errors import DomainError
from deadman.notifications.providers import MessagingProvider
from deadman.services import build_messaging_provider
from deadman.timeutil import Clock, utc_now

logger = logging.getLogger(__name__)

_VALIDATION_MESSAGES = {
    "missing": "This field is required.",
    "string_too_short": "This value is too short.",
    "string_too_long": "This value is too long.",
    "int_parsing": "A whole number is required.",
    "greater_than_equal": "This value is too small.",
    "less_than_equal": "This value is too large.",
}

# Raised by a schema validator as "<field>: <reason>", so a cross-field check can
# still name the field the client sent rather than reporting a bare failure.
_FIELD_PREFIX = re.compile(r"^(?P<field>[a-z_]+):\s*(?P<reason>.+)$")


def _from_prefixed_message(msg: str) -> tuple[str | None, str] | None:
    """Split a `"<field>: <reason>"` validator message, if it carries one.

    Pydantic wraps a raised `ValueError` as `"Value error, <text>"`, so the
    wrapper is stripped before matching or the field name is never seen.
    """
    match = _FIELD_PREFIX.match(msg.removeprefix("Value error,").strip())
    if match is None:
        return None
    return match.group("field"), match.group("reason")


def _first_field(error: dict) -> str | None:
    """The request field that failed, e.g. `check_in_interval_days`.

    The leading `body`/`query` segment is a source marker, not a field name, so
    skipping it is what makes the name usable in the app's field-level messages.
    Cross-field checks have no location at all, so the name comes from the message.
    """
    loc = [str(part) for part in error.get("loc", ()) if part not in ("body", "query", "path")]
    if loc:
        return loc[-1]
    prefixed = _from_prefixed_message(str(error.get("msg", "")))
    return prefixed[0] if prefixed else None


def _validation_message(error: dict) -> str:
    kind = str(error.get("type", ""))
    msg = str(error.get("msg", ""))
    if kind == "value_error":
        prefixed = _from_prefixed_message(msg)
        if prefixed:
            return prefixed[1]
        return msg.removeprefix("Value error,").strip() or "This value is not valid."
    ctx = error.get("ctx") or {}
    base = _VALIDATION_MESSAGES.get(kind, "This value is not valid.")
    if "ge" in ctx and "le" in ctx:
        return f"Must be a whole number between {ctx['ge']} and {ctx['le']}."
    if "ge" in ctx:
        return f"Must be {ctx['ge']} or more."
    if "le" in ctx:
        return f"Must be {ctx['le']} or less."
    return base


def create_app(
    settings: Settings | None = None,
    clock: Clock = utc_now,
    messaging: MessagingProvider | None = None,
) -> FastAPI:
    settings = settings or Settings.from_env()
    connect(settings.db_path).close()  # apply migrations once at startup

    app = FastAPI(title="Travel Safe API", version="1.0.0")
    app.state.settings = settings
    app.state.clock = clock
    app.state.messaging = messaging or build_messaging_provider(settings)
    if settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=list(settings.cors_origins),
            allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
            allow_headers=["Authorization", "Content-Type"],
        )

    @app.exception_handler(DomainError)
    def handle_domain_error(_request: Request, error: DomainError) -> JSONResponse:
        headers = {"WWW-Authenticate": "Bearer"} if error.status_code == 401 else None
        return JSONResponse(
            {"error": {"code": error.code, "message": error.message, "field": error.field}},
            status_code=error.status_code,
            headers=headers,
        )

    @app.exception_handler(RequestValidationError)
    def handle_validation_error(request: Request, error: RequestValidationError) -> JSONResponse:
        """Report schema rejections in the same envelope as every other failure.

        FastAPI's built-in 422 body is `{"detail": [...]}`, which the app's error
        reader cannot parse, so a bad field surfaced as a bare "Request failed with
        422" with no way to tell what was wrong. Logging the rejected value as well
        is what makes an unexplained 422 diagnosable from the server log alone.
        """
        first = error.errors()[0] if error.errors() else {}
        field = _first_field(first)
        logger.warning(
            "validation failed for %s %s: field=%s type=%s value=%r",
            request.method,
            request.url.path,
            field,
            first.get("type"),
            first.get("input"),
        )
        return JSONResponse(
            {
                "error": {
                    "code": "invalid_request",
                    "message": _validation_message(first) if first else "The request body is not valid.",
                    "field": field,
                }
            },
            status_code=422,
        )

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(routes.router)
    app.include_router(public.router)
    return app
