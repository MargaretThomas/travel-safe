from src.api.routes.emergency import router as emergency_router
from src.api.routes.halo import router as halo_router
from src.api.routes.location_groups import router as location_groups_router
from src.api.routes.routes import router as routes_router
from src.api.routes.safety import router as safety_router
from src.api.routes.search import router as search_router

__all__ = [
    "emergency_router",
    "halo_router",
    "location_groups_router",
    "routes_router",
    "safety_router",
    "search_router",
]
