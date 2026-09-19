import re

from fastapi import Header, HTTPException

CLIENT_ID_RE = re.compile(r"^[A-Za-z0-9._:-]{3,80}$")


def require_client_id(
    x_client_id: str | None = Header(default=None, alias="X-Client-ID"),
) -> str:
    if x_client_id is None or not CLIENT_ID_RE.fullmatch(x_client_id):
        raise HTTPException(
            status_code=401,
            detail="A valid temporary X-Client-ID header is required",
        )
    return x_client_id
