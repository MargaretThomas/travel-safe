from src.models.safety import (
    AreaStatsResponse,
    DatasetStatusResponse,
    GoldenSpotResponse,
    HeatmapCell,
    HeatmapResponse,
    MapSearchResponse,
    SafetySignalResponse,
)
from src.providers.base import CrimeDataProvider
from src.providers.datafirst import DataFirstCrimeProvider
from src.providers.golden_spots import GoldenSpotProvider
from src.providers.reference import ReferenceCrimeProvider

WOODSTOCK_CENTROID = (-33.9270, 18.4470)


class SafetyService:
    def __init__(
        self,
        provider: CrimeDataProvider | None = None,
        national_provider: DataFirstCrimeProvider | None = None,
        golden_provider: GoldenSpotProvider | None = None,
    ) -> None:
        self.provider = provider or ReferenceCrimeProvider()
        self.national_provider = national_provider or DataFirstCrimeProvider()
        self.golden_provider = golden_provider or GoldenSpotProvider()

    def sources(self):
        return self.provider.sources()

    def area_stats(
        self,
        area_code: str,
        year: str | None = None,
    ) -> AreaStatsResponse | None:
        if self.national_provider.available:
            return self.national_provider.area_stats(area_code, year=year)
        return self.provider.area_stats(area_code)

    def heatmap(
        self,
        bbox: tuple[float, float, float, float],
        zoom: int,
        year: str | None = None,
        limit: int = 1500,
    ) -> HeatmapResponse:
        if self.national_provider.available:
            national = self.national_provider.heatmap(
                bbox=bbox,
                zoom=zoom,
                year=year,
                limit=limit,
            )
            if national is not None:
                return national

        west, south, east, north = bbox
        lat, lon = WOODSTOCK_CENTROID
        cells: list[HeatmapCell] = []
        stats = None

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
                        year=stats.period,
                        quality_flags=["reference_fixture_only"],
                    )
                )

        return HeatmapResponse(
            bbox=bbox,
            zoom=zoom,
            cells=cells,
            normalization="Reference-only fallback; national DataFirst CSV not loaded.",
            caveats=[
                "Cells represent aggregate precinct context, not crime-event pins.",
                "Do not interpret cell centroids as incident locations.",
                "Load the DataFirst CSV to activate nationwide station scoring.",
            ],
            year=stats.period if cells and stats is not None else None,
            source_id="saps-reference-via-safesuburb" if cells else None,
        )

    def safety_signal(
        self,
        area_code: str,
        year: str | None = None,
    ) -> SafetySignalResponse | None:
        if self.national_provider.available:
            return self.national_provider.safety_signal(area_code, year=year)

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
                "A safety score is intentionally withheld in reference-only mode.",
                "Load the national DataFirst dataset to activate comparative grading.",
                "Crime statistics do not guarantee personal safety.",
            ],
            source_ids=[stats.source_id],
        )

    def search(
        self,
        query: str,
        year: str | None = None,
        limit: int = 20,
    ) -> MapSearchResponse:
        station_results = self.national_provider.search(
            query=query,
            year=year,
            limit=limit,
        )
        remaining = max(0, limit - len(station_results))
        golden_results = self.golden_provider.search(query, limit=remaining)
        return MapSearchResponse(
            query=query,
            results=[*station_results, *golden_results][:limit],
        )

    def golden_spots(
        self,
        bbox: tuple[float, float, float, float],
        query: str | None = None,
    ) -> GoldenSpotResponse:
        return GoldenSpotResponse(
            spots=self.golden_provider.within_bbox(bbox, query=query),
            caveat=(
                "Gold marks curated local known spots. A gold marker is not a "
                "claim that the place is crime-free or guarantees personal safety."
            ),
        )

    def dataset_status(self) -> DatasetStatusResponse:
        return self.national_provider.status()
