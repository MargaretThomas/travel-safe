from src.models.safety import (
    AreaStatsResponse,
    HeatmapCell,
    HeatmapResponse,
    SafetySignalResponse,
)
from src.providers.base import CrimeDataProvider
from src.providers.reference import ReferenceCrimeProvider

WOODSTOCK_CENTROID = (-33.9270, 18.4470)


class SafetyService:
    def __init__(self, provider: CrimeDataProvider | None = None) -> None:
        self.provider = provider or ReferenceCrimeProvider()

    def area_stats(self, area_code: str) -> AreaStatsResponse | None:
        return self.provider.area_stats(area_code)

    def heatmap(
        self,
        bbox: tuple[float, float, float, float],
        zoom: int,
    ) -> HeatmapResponse:
        west, south, east, north = bbox
        lat, lon = WOODSTOCK_CENTROID
        cells: list[HeatmapCell] = []

        if west <= lon <= east and south <= lat <= north:
            stats = self.provider.area_stats("woodstock")
            if stats is not None:
                cells.append(
                    HeatmapCell(
                        id="woodstock-precinct-reference",
                        latitude=lat,
                        longitude=lon,
                        label=stats.area_name,
                        reported_crimes=stats.total_reported_crimes,
                        relative_intensity=1.0,
                        resolution="precinct_aggregate",
                        source_id=stats.source_id,
                    )
                )

        return HeatmapResponse(
            bbox=bbox,
            zoom=zoom,
            cells=cells,
            normalization="viewport-relative; single reference precinct in MVP",
            caveats=[
                "Cells represent aggregate precinct context, not crime-event pins.",
                "Do not interpret cell centroids as incident locations.",
                "Reference fixture is for frontend integration until live SAPS ingestion.",
            ],
        )

    def safety_signal(self, area_code: str) -> SafetySignalResponse | None:
        stats = self.provider.area_stats(area_code)
        if stats is None:
            return None

        return SafetySignalResponse(
            area_code=stats.area_code,
            area_name=stats.area_name,
            status="insufficient_data",
            score=None,
            confidence=0.0,
            period=stats.period,
            explanation=[
                "A safety score is intentionally withheld in the MVP.",
                "Peer calibration, reliable denominators and model validation are required.",
                "Crime statistics describe reported crime and do not guarantee personal safety.",
            ],
            source_ids=[stats.source_id],
        )
