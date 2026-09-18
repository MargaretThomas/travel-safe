from src.api.routes.emergency import router as emergency_router
from src.api.routes.location_groups import router as location_groups_router
from src.api.routes.safety import router as safety_router

__all__ = [
    "emergency_router",
    "location_groups_router",
    "safety_router",
]
