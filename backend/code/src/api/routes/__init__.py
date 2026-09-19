from src.api.emergency_service_api import router as emergency_services_router
from src.api.routes.safety import router as safety_router

__all__ = ["emergency_services_router", "safety_router"]
