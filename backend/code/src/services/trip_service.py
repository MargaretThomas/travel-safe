from src.models.safety import (
    HeatmapResponse,
    Pathway,
    TripPoint,
    TripProfile,
    TripRequest,
    TripResponse,
)
from src.providers.mapbox_directions import (
    MapboxDirectionsClient,
    MapboxDirectionsError,
)
from src.providers.osrm_directions import OsrmDirectionsClient, OsrmDirectionsError
from src.services.geo import (
    mock_duration_seconds,
    mock_pathway_coordinates,
    pad_bbox_from_coordinates,
    pathway_distance_meters,
    points_are_the_same,
)
from src.services.safety_service import SafetyService


class TripValidationError(ValueError):
    pass


class TripService:
    def __init__(
        self,
        directions_client: MapboxDirectionsClient | None = None,
        osrm_client: OsrmDirectionsClient | None = None,
        safety_service: SafetyService | None = None,
    ) -> None:
        self.directions = directions_client or MapboxDirectionsClient()
        self.osrm = osrm_client or OsrmDirectionsClient()
        self.safety_service = safety_service or SafetyService()

    def plan(self, request: TripRequest) -> TripResponse:
        origin = request.origin
        destination = request.destination
        if points_are_the_same(
            origin.latitude,
            origin.longitude,
            destination.latitude,
            destination.longitude,
        ):
            raise TripValidationError(
                "origin and destination must be different locations"
            )

        pathway = self._pathway(origin, destination, request.profile)
        bbox = pad_bbox_from_coordinates(pathway.coordinates)
        heatmap = self._heatmap(bbox)
        return TripResponse(
            origin=origin,
            destination=destination,
            pathway=pathway,
            heatmap=heatmap,
        )

    def _pathway(
        self,
        origin: TripPoint,
        destination: TripPoint,
        profile: TripProfile,
    ) -> Pathway:
        if self.directions.has_token():
            try:
                return self.directions.route(
                    origin.latitude,
                    origin.longitude,
                    destination.latitude,
                    destination.longitude,
                    profile,
                )
            except MapboxDirectionsError:
                pass

        try:
            return self.osrm.route(
                origin.latitude,
                origin.longitude,
                destination.latitude,
                destination.longitude,
                profile,
            )
        except OsrmDirectionsError:
            if profile == "walking":
                try:
                    return self.osrm.route(
                        origin.latitude,
                        origin.longitude,
                        destination.latitude,
                        destination.longitude,
                        "driving",
                    )
                except OsrmDirectionsError:
                    pass

        return self._mock_pathway(origin, destination, profile)

    def _mock_pathway(
        self,
        origin: TripPoint,
        destination: TripPoint,
        profile: TripProfile,
    ) -> Pathway:
        coordinates = mock_pathway_coordinates(
            origin.latitude,
            origin.longitude,
            destination.latitude,
            destination.longitude,
        )
        distance = pathway_distance_meters(coordinates)
        return Pathway(
            coordinates=coordinates,
            distance_meters=distance,
            duration_seconds=mock_duration_seconds(distance, profile),
            provider="mock",
        )

    def _heatmap(
        self,
        bbox: tuple[float, float, float, float],
    ) -> HeatmapResponse:
        result = self.safety_service.heatmap(
            bbox=bbox,
            zoom=12,
            year=None,
            limit=1500,
        )
        if result is None:
            return HeatmapResponse(
                bbox=bbox,
                zoom=12,
                cells=[],
                normalization=(
                    "No national safety data available for this corridor."
                ),
                caveats=[
                    "No route safety context is available for this corridor.",
                    "Do not infer safety from an empty heatmap response.",
                ],
            )
        return result
