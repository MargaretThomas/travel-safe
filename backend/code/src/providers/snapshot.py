import gzip
import json
from pathlib import Path

from src.core.risk_model import MODEL_VERSION
from src.models.safety import (
    AreaStatsResponse,
    CrimeCategoryStat,
    DatasetStatusResponse,
    HeatmapCell,
    HeatmapLegendItem,
    HeatmapResponse,
    MapSearchResult,
    SafetySignalResponse,
)

SNAPSHOT_FILENAME = "safety-map-2025-2026.danger-v1.1.json.gz"
SOURCE_ID = "datafirst-saps-annual-v1.4"
SOURCE_URL = "https://doi.org/10.25828/5MAW-4H90"
EXPECTED_YEAR = "2025/2026"
EXPECTED_RECORDS = 24206
EXPECTED_STATIONS = 1174
EXPECTED_MAPPABLE = 1128
STATION_ALIASES = {
    "aberdeen": "xamdeboo",
    "graaff-reinet": "robert-sobukwe",
    "east-london": "kugompo",
    "barkly-east": "ekhephinit",
}


class SnapshotCrimeProvider:
    def __init__(self, path: str | Path | None = None) -> None:
        self.path = Path(
            path
            or (
                Path(__file__).resolve().parents[3]
                / "data"
                / SNAPSHOT_FILENAME
            )
        )
        self.load_error: str | None = None
        self._meta: dict[str, object] = {}
        self._cells: list[HeatmapCell] = []
        self._raw_by_code: dict[str, dict[str, object]] = {}
        self._load()

    @property
    def available(self) -> bool:
        return bool(self._cells) and self.load_error is None

    @property
    def latest_year(self) -> str | None:
        value = self._meta.get("year")
        return str(value) if value else None

    def _load(self) -> None:
        if not self.path.exists():
            self.load_error = "Bundled national safety snapshot is unavailable."
            return

        try:
            with gzip.open(self.path, "rt", encoding="utf-8") as handle:
                payload = json.load(handle)
            self._validate(payload)
            raw_cells = payload["cells"]
            self._cells = [
                HeatmapCell.model_validate(item)
                for item in raw_cells
            ]
            self._raw_by_code = {
                str(item["area_code"]): item
                for item in raw_cells
            }
            self._meta = payload
        except (OSError, ValueError, TypeError, KeyError, json.JSONDecodeError):
            self.load_error = "Bundled national safety snapshot could not be validated."

    def _validate(self, payload: object) -> None:
        if not isinstance(payload, dict):
            raise TypeError("snapshot root")
        checks = {
            "schema_version": 1,
            "source_id": SOURCE_ID,
            "dataset_version": "1.4",
            "year": EXPECTED_YEAR,
            "model_version": MODEL_VERSION,
            "source_record_count": EXPECTED_RECORDS,
            "source_station_count": EXPECTED_STATIONS,
            "mappable_station_count": EXPECTED_MAPPABLE,
        }
        for key, expected in checks.items():
            if payload.get(key) != expected:
                raise ValueError(f"snapshot {key}")
        cells = payload.get("cells")
        if not isinstance(cells, list) or len(cells) != EXPECTED_MAPPABLE:
            raise ValueError("snapshot cells")

    def _resolve_year(self, year: str | None) -> str | None:
        selected = year or self.latest_year
        return selected if selected == EXPECTED_YEAR else None

    def _resolve_code(self, area_code: str) -> str:
        normalized = area_code.strip().lower().replace("_", "-")
        return STATION_ALIASES.get(normalized, normalized)

    def heatmap(
        self,
        bbox: tuple[float, float, float, float],
        zoom: int,
        year: str | None = None,
        limit: int = 1500,
    ) -> HeatmapResponse | None:
        selected_year = self._resolve_year(year)
        if not self.available or selected_year is None:
            return None

        west, south, east, north = bbox
        cells = [
            cell
            for cell in self._cells
            if west <= cell.longitude <= east
            and south <= cell.latitude <= north
        ]
        cells.sort(key=lambda item: item.danger_score or 0, reverse=True)

        return HeatmapResponse(
            bbox=bbox,
            zoom=zoom,
            cells=cells[:limit],
            normalization=(
                "danger-v1.1 severity-weighted station percentiles "
                "for SAPS/DataFirst 2025/2026."
            ),
            caveats=[
                "Map anchors are annual police-station aggregates, not incident pins.",
                "Scores are comparative burden signals, not per-capita crime rates.",
                "Police-action offences do not contribute to danger_score.",
            ],
            year=selected_year,
            source_id=SOURCE_ID,
            model_version=MODEL_VERSION,
            legend=[
                HeatmapLegendItem(
                    band="green",
                    min_score=0,
                    max_score=44.99,
                    color="#22C55E",
                    meaning="Lower relative danger burden.",
                ),
                HeatmapLegendItem(
                    band="orange",
                    min_score=45,
                    max_score=74.99,
                    color="#F97316",
                    meaning="Elevated relative danger burden.",
                ),
                HeatmapLegendItem(
                    band="red",
                    min_score=75,
                    max_score=100,
                    color="#EF4444",
                    meaning="High relative danger burden.",
                ),
            ],
        )

    def area_stats(
        self,
        area_code: str,
        year: str | None = None,
    ) -> AreaStatsResponse | None:
        selected_year = self._resolve_year(year)
        if not self.available or selected_year is None:
            return None
        raw = self._raw_by_code.get(self._resolve_code(area_code))
        if raw is None:
            return None
        cell = HeatmapCell.model_validate(raw)
        return AreaStatsResponse(
            area_code=str(raw["area_code"]),
            area_name=cell.label,
            area_type="police_station",
            period=selected_year,
            total_reported_crimes=cell.reported_crimes,
            previous_period_total=None,
            latest_quarter_total=None,
            latest_quarter_previous_year=None,
            top_categories=[
                CrimeCategoryStat(category=item.label, count=item.count)
                for item in cell.top_crimes
            ],
            source_id=SOURCE_ID,
            source_url=SOURCE_URL,
            data_resolution="annual police-station aggregate",
            caveats=[
                "Counts are annual police-station aggregates.",
                "The score is not population-normalized.",
            ],
        )

    def safety_signal(
        self,
        area_code: str,
        year: str | None = None,
    ) -> SafetySignalResponse | None:
        selected_year = self._resolve_year(year)
        if not self.available or selected_year is None:
            return None
        raw = self._raw_by_code.get(self._resolve_code(area_code))
        if raw is None:
            return None
        cell = HeatmapCell.model_validate(raw)
        if cell.safety_score is None or cell.danger_score is None:
            return None
        return SafetySignalResponse(
            area_code=str(raw["area_code"]),
            area_name=cell.label,
            status="available",
            score=cell.safety_score,
            confidence=cell.confidence or 0,
            period=selected_year,
            explanation=[
                "Safety score is 100 minus the comparative danger score.",
                "Danger is relative to stations in the same financial year.",
                "The score does not guarantee personal safety.",
            ],
            source_ids=[SOURCE_ID],
            danger_score=cell.danger_score,
            risk_band=cell.risk_band,
            color=cell.color,
            top_crimes=cell.top_crimes,
            model_version=MODEL_VERSION,
        )

    def search(
        self,
        query: str,
        year: str | None = None,
        limit: int = 20,
    ) -> list[MapSearchResult]:
        selected_year = self._resolve_year(year)
        if not self.available or selected_year is None:
            return []
        needle = query.strip().lower()
        matches: list[tuple[int, HeatmapCell]] = []
        for cell in self._cells:
            haystack = " ".join(
                value
                for value in [
                    cell.label,
                    cell.local_municipality or "",
                    cell.district_municipality or "",
                ]
                if value
            ).lower()
            if needle not in haystack:
                continue
            priority = 0 if cell.label.lower() == needle else 1
            matches.append((priority, cell))
        matches.sort(
            key=lambda item: (
                item[0],
                -(item[1].danger_score or 0),
                item[1].label,
            )
        )
        return [
            MapSearchResult(
                result_type="police_station",
                id=str(self._resolve_code(cell.label)),
                name=cell.label,
                latitude=cell.latitude,
                longitude=cell.longitude,
                subtitle=" · ".join(
                    value
                    for value in [
                        cell.local_municipality or "",
                        cell.district_municipality or "",
                    ]
                    if value
                ),
                color=cell.color or "#94A3B8",
                year=selected_year,
                danger_score=cell.danger_score,
                safety_score=cell.safety_score,
                risk_band=cell.risk_band,
                top_crimes=cell.top_crimes[:3],
            )
            for _, cell in matches[:limit]
        ]

    def status(self) -> DatasetStatusResponse:
        return DatasetStatusResponse(
            loaded=self.available,
            source_id=SOURCE_ID,
            dataset_version="1.4",
            path=self.path.name,
            latest_year=EXPECTED_YEAR if self.available else None,
            years=[EXPECTED_YEAR] if self.available else [],
            records=EXPECTED_RECORDS if self.available else 0,
            stations_latest_year=EXPECTED_STATIONS if self.available else 0,
            mappable_latest_year=EXPECTED_MAPPABLE if self.available else 0,
            load_error=self.load_error,
            nationwide_ready=self.available,
            model_version=MODEL_VERSION,
            data_mode="derived_snapshot",
        )
