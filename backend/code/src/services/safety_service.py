from src.models.safety import (
    AreaStatsResponse,
    DatasetStatusResponse,
    HeatmapCell,
    HeatmapResponse,
    MapSearchResponse,
    SafetySignalResponse,
)
from src.providers.base import CrimeDataProvider
from src.providers.datafirst import DataFirstCrimeProvider
from src.providers.reference import ReferenceCrimeProvider
from src.providers.snapshot import SnapshotCrimeProvider

WOODSTOCK_CENTROID = (-33.9270, 18.4470)


class SafetyService:
    def __init__(
        self,
        provider: CrimeDataProvider | None = None,
        national_provider: DataFirstCrimeProvider | None = None,
        snapshot_provider: SnapshotCrimeProvider | None = None,
    ) -> None:
        self.provider = provider or ReferenceCrimeProvider()
        self.national_provider = national_provider or DataFirstCrimeProvider()
        self.snapshot_provider = snapshot_provider or SnapshotCrimeProvider()

    def sources(self):
        return self.provider.sources()

    def _national(self):
        raw_status = self.national_provider.status()
        if raw_status.nationwide_ready:
            return self.national_provider
        if self.snapshot_provider.available:
            return self.snapshot_provider
        return None

    def area_stats(
        self,
        area_code: str,
        year: str | None = None,
    ) -> AreaStatsResponse | None:
        national = self._national()
        if national is not None:
            return national.area_stats(area_code, year=year)
        return self.provider.area_stats(area_code)

    def heatmap(
        self,
        bbox: tuple[float, float, float, float],
        zoom: int,
        year: str | None = None,
        limit: int = 1500,
    ) -> HeatmapResponse | None:
        national = self._national()
        if national is not None:
            return national.heatmap(
                bbox=bbox,
                zoom=zoom,
                year=year,
                limit=limit,
            )

        if year is not None:
            return None

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
            normalization="Reference-only fallback; national data unavailable.",
            caveats=[
                "Cells represent aggregate precinct context, not crime-event pins.",
                "Do not interpret cell centroids as incident locations.",
            ],
            year=stats.period if cells and stats is not None else None,
            source_id="saps-reference-via-safesuburb" if cells else None,
        )

    def safety_signal(
        self,
        area_code: str,
        year: str | None = None,
    ) -> SafetySignalResponse | None:
        national = self._national()
        if national is not None:
            return national.safety_signal(area_code, year=year)

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
                "A safety score is unavailable in reference-only mode.",
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
        national = self._national()
        results = (
            national.search(query=query, year=year, limit=limit)
            if national is not None
            else []
        )
        return MapSearchResponse(query=query, results=results[:limit])

    def dataset_status(self) -> DatasetStatusResponse:
        raw_status = self.national_provider.status()
        if raw_status.nationwide_ready:
            return raw_status
        if self.snapshot_provider.available:
            return self.snapshot_provider.status()
        return raw_status
