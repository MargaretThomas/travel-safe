import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.routes import (
    emergency_router,
    halo_router,
    location_groups_router,
    safety_router,
)

load_dotenv()


def get_allowed_origins() -> list[str]:
    return [
        origin.strip()
        for origin in os.getenv("ALLOWED_ORIGINS", "").split(",")
        if origin.strip()
    ]


app = FastAPI(
    title="Travel Safe",
    summary="Travel Safe FastAPI backend that powers the Travel Safe mobile app",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(safety_router)
app.include_router(emergency_router)
app.include_router(location_groups_router)
app.include_router(halo_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
