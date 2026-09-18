import math

from src.core.risk_model import risk_band
from src.models.routes import (
    RouteAnalyseResponse,
    RouteCandidate,
    RouteCoordinate,
    RouteHaloContext,
    RouteRiskResult,
)
from src.models.safety import HeatmapCell
from src.services.halo_service import HaloService
from src.services.safety_service import SafetyService

ROUTE_MODEL_VERSION = "route-context-v1"
SAMPLE_SPACING_METERS = 750.0
MAX_SAMPLES = 250
HEATMAP_PADDING_DEGREES = 0.25
HALO_NEAR_ROUTE_METERS = 750.0
MAX_CONTEXT_DISTANCE_METERS = 50_000.0


def _haversine_meters(a: RouteCoordinate, b: RouteCoordinate) -> float:
    radius_m = 6_371_000.0
    lat1 = math.radians(a.latitude)
    lat2 = math.radians(b.latitude)
    d_lat = lat2 - lat1
    d_lon = math.radians(b.longitude - a.longitude)
    value = (
        math.sin(d_lat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(d_lon / 2) ** 2
    )
    return 2 * radius_m * math.atan2(math.sqrt(value), math.sqrt(1 - value))


def _route_samples(candidate: RouteCandidate) -> list[RouteCoordinate]:
    samples: list[RouteCoordinate] = [candidate.coordinates[0]]
    for start, end in zip(candidate.coordinates, candidate.coordinates[1:]):
        distance = _haversine_meters(start, end)
        steps = max(1, math.ceil(distance / SAMPLE_SPACING_METERS))
        for index in range(1, steps + 1):
            ratio = index / steps
            samples.append(
                RouteCoordinate(
                    latitude=start.latitude
                    + (end.latitude - start.latitude) * ratio,
                    longitude=start.longitude
                    + (end.longitude - start.longitude) * ratio,
                )
            )

    if len(samples) <= MAX_SAMPLES:
        return samples

    last = len(samples) - 1
    indexes = {
        round(index * last / (MAX_SAMPLES - 1))
        for index in range(MAX_SAMPLES)
    }
    return [samples[index] for index in sorted(indexes)]


def _route_bbox(
    candidate: RouteCandidate,
) -> tuple[float, float, float, float]:
    latitudes = [point.latitude for point in candidate.coordinates]
    longitudes = [point.longitude for point in candidate.coordinates]
    return (
        min(longitudes) - HEATMAP_PADDING_DEGREES,
        min(latitudes) - HEATMAP_PADDING_DEGREES,
        max(longitudes) + HEATMAP_PADDING_DEGREES,
        max(latitudes) + HEATMAP_PADDING_DEGREES,
    )


def _nearest_cell(
    point: RouteCoordinate,
    cells: list[HeatmapCell],
) -> tuple[HeatmapCell | None, float]:
    best: HeatmapCell | None = None
    best_distance = math.inf
    for cell in cells:
        distance = _haversine_meters(
            point,
            RouteCoordinate(
                latitude=cell.latitude,
                longitude=cell.longitude,
            ),
        )
        if distance < best_distance:
            best = cell
            best_distance = distance
    return best, best_distance


class RouteSafetyService:
    def __init__(
        self,
        safety_service: SafetyService,
        halo_service: HaloService,
    ) -> None:
        self.safety_service = safety_service
        self.halo_service = halo_service

    def _nearby_halo(
        self,
        candidate: RouteCandidate,
        samples: list[RouteCoordinate],
    ) -> list[RouteHaloContext]:
        halos = self.halo_service.list_halo(bbox=_route_bbox(candidate)).items
        context: list[RouteHaloContext] = []
        for halo in halos:
            halo_point = RouteCoordinate(
                latitude=halo.latitude,
                longitude=halo.longitude,
            )
            distance = min(
                _haversine_meters(sample, halo_point)
                for sample in samples
            )
            if distance > HALO_NEAR_ROUTE_METERS:
                continue
            context.append(
                RouteHaloContext(
                    id=halo.id,
                    name=halo.name,
                    latitude=halo.latitude,
                    longitude=halo.longitude,
                    distance_from_route_meters=round(distance, 1),
                    visitability_score=halo.community.visitability_score,
                    visitability_confidence=(
                        halo.community.visitability_confidence
                    ),
                )
            )
        context.sort(key=lambda item: (item.distance_from_route_meters, item.name))
        return context[:5]

    def _analyse_candidate(
        self,
        candidate: RouteCandidate,
        year: str,
    ) -> RouteRiskResult:
        samples = _route_samples(candidate)
        heatmap = self.safety_service.heatmap(
            _route_bbox(candidate),
            zoom=8,
            year=year,
            limit=1500,
        )
        cells = heatmap.cells if heatmap is not None else []

        danger_values: list[float] = []
        bands: list[str] = []
        confidence_values: list[float] = []

        for sample in samples:
            cell, distance = _nearest_cell(sample, cells)
            if (
                cell is None
                or distance > MAX_CONTEXT_DISTANCE_METERS
                or cell.danger_score is None
                or cell.risk_band is None
            ):
                continue
            danger_values.append(cell.danger_score)
            bands.append(cell.risk_band)
            source_confidence = cell.confidence if cell.confidence is not None else 0.5
            proximity_factor = max(
                0.2,
                1 - min(distance, MAX_CONTEXT_DISTANCE_METERS)
                / MAX_CONTEXT_DISTANCE_METERS,
            )
            confidence_values.append(
                min(0.75, source_confidence * proximity_factor)
            )

        nearby_halo = self._nearby_halo(candidate, samples)

        if not danger_values:
            return RouteRiskResult(
                id=candidate.id,
                profile=candidate.profile,
                distance_meters=candidate.distance_meters,
                duration_seconds=candidate.duration_seconds,
                context_status="insufficient_data",
                confidence=0.0,
                green_exposure_ratio=0.0,
                orange_exposure_ratio=0.0,
                red_exposure_ratio=0.0,
                sampled_points=len(samples),
                nearby_halo=nearby_halo,
            )

        exposure = round(sum(danger_values) / len(danger_values), 2)
        total = len(bands)
        green_ratio = bands.count("green") / total
        orange_ratio = bands.count("orange") / total
        red_ratio = bands.count("red") / total
        confidence = (
            round(sum(confidence_values) / len(confidence_values), 2)
            if confidence_values
            else 0.0
        )

        return RouteRiskResult(
            id=candidate.id,
            profile=candidate.profile,
            distance_meters=candidate.distance_meters,
            duration_seconds=candidate.duration_seconds,
            context_status="available",
            exposure_score=exposure,
            safety_context_score=round(100 - exposure, 2),
            exposure_band=risk_band(exposure),
            green_exposure_ratio=round(green_ratio, 3),
            orange_exposure_ratio=round(orange_ratio, 3),
            red_exposure_ratio=round(red_ratio, 3),
            max_danger_score=round(max(danger_values), 2),
            confidence=confidence,
            sampled_points=len(samples),
            nearby_halo=nearby_halo,
        )

    def analyse(
        self,
        candidates: list[RouteCandidate],
        year: str,
    ) -> RouteAnalyseResponse:
        results = [
            self._analyse_candidate(candidate, year)
            for candidate in candidates
        ]
        available = [
            result
            for result in results
            if result.exposure_score is not None
        ]
        available.sort(
            key=lambda result: (
                result.exposure_score or 100,
                result.red_exposure_ratio,
                result.orange_exposure_ratio,
                result.distance_meters,
            )
        )
        selected = available[0].id if available else None

        return RouteAnalyseResponse(
            lower_risk_route_id=selected,
            year=year,
            model_version=ROUTE_MODEL_VERSION,
            routes=results,
            selection_basis=(
                "Lowest comparative SAPS/DataFirst danger exposure across "
                "the supplied real road-route candidates."
            ),
            caveats=[
                "This is lower-risk route context, not a safety guarantee.",
                (
                    "Crime inputs are annual police-station aggregates, not "
                    "street-level incident locations."
                ),
                "Station coordinates are context anchors, not crime locations.",
                (
                    "Halo visitability is shown separately and never lowers route "
                    "danger exposure."
                ),
                "Road geometry must come from the map/directions provider.",
            ],
        )
