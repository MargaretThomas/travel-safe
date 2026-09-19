import csv
import logging
import re
from dataclasses import dataclass
from pathlib import Path

from src.core.config import get_setting
from src.core.risk_model import (
    CATEGORY_LABELS,
    DANGER_WEIGHTS,
    MODEL_VERSION,
    POLICE_ACTION_FIELDS,
    danger_score,
    risk_band,
    risk_color,
    sanitize_count,
)
from src.models.safety import (
    AreaStatsResponse,
    CrimeCategoryStat,
    DatasetStatusResponse,
    HeatmapCell,
    HeatmapLegendItem,
    HeatmapResponse,
    MapCrimeStat,
    MapSearchResult,
    SafetySignalResponse,
)

DATASET_SOURCE_ID = "datafirst-saps-annual-v1.4"
DATASET_VERSION = "1.4"
DATASET_URL = "https://www.datafirst.uct.ac.za/dataportal/index.php/catalog/1012"
DEFAULT_FILENAME = "sapacr-2005-2026-v1_4.csv"
EXPECTED_TOTAL_RECORDS = 24206
EXPECTED_LATEST_YEAR = "2025/2026"
EXPECTED_LATEST_STATIONS = 1174
logger = logging.getLogger(__name__)
PARTIAL_2025_26_STATIONS = {"koopmansfontein", "tafalehashe"}
STATION_ALIASES_2025_26 = {
    "aberdeen": "xamdeboo",
    "graaff-reinet": "robert-sobukwe",
    "east-london": "kugompo",
    "barkly-east": "ekhephinit",
}

CORE_COLUMNS = {
    "year",
    "station",
    "loc_mn",
    "dc_mn",
    "longitude",
    "latitude",
    *CATEGORY_LABELS.keys(),
}


@dataclass(frozen=True)
class StationProfile:
    area_code: str
    year: str
    station: str
    local_municipality: str
    district_municipality: str
    latitude: float | None
    longitude: float | None
    counts: dict[str, int]
    danger_score: float
    safety_score: float
    risk_band: str
    color: str
    confidence: float
    quality_flags: tuple[str, ...]


def _slug(value: str) -> str:
    cleaned = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return cleaned or "unknown"


def _year_key(value: str) -> tuple[int, ...]:
    numbers = tuple(int(item) for item in re.findall(r"\d{4}", value))
    return numbers or (0,)


def _parse_float(value: str | None) -> float | None:
    if value is None or not value.strip():
        return None
    try:
        return float(value)
    except ValueError:
        return None


def _parse_count(value: str | None) -> int:
    if value is None or not value.strip():
        return 0
    try:
        return int(float(value))
    except ValueError:
        return 0


class DataFirstCrimeProvider:
    def __init__(self, path: str | Path | None = None) -> None:
        default_path = (
            Path(__file__).resolve().parents[3] / "data" / DEFAULT_FILENAME
        )
        configured = path or get_setting("SAPS_CRIME_CSV_PATH") or default_path
        self.path = Path(configured).expanduser()
        self.load_error: str | None = None
        self._rows: list[dict[str, object]] = []
        self._profiles_by_year: dict[str, list[StationProfile]] = {}
        self._profiles_by_year_code: dict[tuple[str, str], StationProfile] = {}
        self._years: list[str] = []
        self._load()

    @property
    def available(self) -> bool:
        return bool(self._profiles_by_year) and self.load_error is None

    @property
    def years(self) -> list[str]:
        return self._years.copy()

    @property
    def latest_year(self) -> str | None:
        return self._years[-1] if self._years else None

    def _load(self) -> None:
        if not self.path.exists():
            logger.warning("DataFirst dataset not found at %s", self.path)
            self.load_error = "National DataFirst CSV is not installed or configured."
            return

        try:
            with self.path.open("r", encoding="utf-8-sig", newline="") as handle:
                sample = handle.read(8192)
                handle.seek(0)
                try:
                    dialect = csv.Sniffer().sniff(sample, delimiters=",;\t")
                except csv.Error:
                    dialect = csv.excel
                reader = csv.DictReader(handle, dialect=dialect)
                fieldnames = set(reader.fieldnames or [])
                missing = sorted(CORE_COLUMNS - fieldnames)
                if missing:
                    raise ValueError(
                        "DataFirst file is missing required columns: "
                        + ", ".join(missing)
                    )

                for raw in reader:
                    counts = {
                        field: _parse_count(raw.get(field))
                        for field in CATEGORY_LABELS
                    }
                    self._rows.append(
                        {
                            "year": (raw.get("year") or "").strip(),
                            "station": (raw.get("station") or "").strip(),
                            "loc_mn": (raw.get("loc_mn") or "").strip(),
                            "dc_mn": (raw.get("dc_mn") or "").strip(),
                            "longitude": _parse_float(raw.get("longitude")),
                            "latitude": _parse_float(raw.get("latitude")),
                            "counts": counts,
                        }
                    )
            self._build_profiles()
        except (OSError, ValueError, csv.Error):
            logger.exception("Failed to load DataFirst dataset from %s", self.path)
            self.load_error = "National DataFirst CSV could not be loaded."

    def _build_profiles(self) -> None:
        rows_by_year: dict[str, list[dict[str, object]]] = {}
        for row in self._rows:
            year = str(row["year"])
            if not year:
                continue
            rows_by_year.setdefault(year, []).append(row)

        for year, rows in rows_by_year.items():
            distributions = {
                field: sorted(
                    sanitize_count(
                        (row["counts"] if isinstance(row["counts"], dict) else {}).get(
                            field
                        )
                    )
                    for row in rows
                )
                for field in DANGER_WEIGHTS
            }

            profiles: list[StationProfile] = []
            for row in rows:
                station = str(row["station"])
                if not station:
                    continue
                counts = row["counts"]
                if not isinstance(counts, dict):
                    continue
                score = danger_score(counts, distributions)
                flags: list[str] = []
                negative_fields = [
                    field
                    for field, value in counts.items()
                    if isinstance(value, int) and value < 0
                ]
                if negative_fields:
                    flags.append("negative_adjustments_present")
                if not row["loc_mn"]:
                    flags.append("local_municipality_missing")
                if not row["dc_mn"]:
                    flags.append("district_municipality_missing")
                if (
                    year == "2025/2026"
                    and _slug(station) in PARTIAL_2025_26_STATIONS
                ):
                    flags.append("partial_year_station")

                confidence = 0.90
                if negative_fields:
                    confidence -= 0.05
                if not row["loc_mn"]:
                    confidence -= 0.05
                if not row["dc_mn"]:
                    confidence -= 0.05
                if "partial_year_station" in flags:
                    confidence -= 0.20
                confidence = round(max(0.40, confidence), 2)

                profile = StationProfile(
                    area_code=_slug(station),
                    year=year,
                    station=station,
                    local_municipality=str(row["loc_mn"]),
                    district_municipality=str(row["dc_mn"]),
                    latitude=(
                        float(row["latitude"])
                        if isinstance(row["latitude"], float)
                        else None
                    ),
                    longitude=(
                        float(row["longitude"])
                        if isinstance(row["longitude"], float)
                        else None
                    ),
                    counts={key: int(value) for key, value in counts.items()},
                    danger_score=score,
                    safety_score=round(100 - score, 2),
                    risk_band=risk_band(score),
                    color=risk_color(score),
                    confidence=confidence,
                    quality_flags=tuple(flags),
                )
                profiles.append(profile)
                self._profiles_by_year_code[(year, profile.area_code)] = profile
            self._profiles_by_year[year] = profiles

        self._years = sorted(self._profiles_by_year, key=_year_key)

    def _resolve_year(self, year: str | None) -> str | None:
        if not self.available:
            return None
        if year is None:
            return self.latest_year
        return year if year in self._profiles_by_year else None

    def _top_crimes(self, profile: StationProfile, limit: int = 5) -> list[MapCrimeStat]:
        ranked = sorted(
            profile.counts.items(),
            key=lambda item: sanitize_count(item[1]),
            reverse=True,
        )
        result: list[MapCrimeStat] = []
        for field, raw_count in ranked:
            count = sanitize_count(raw_count)
            if count <= 0:
                continue
            note = None
            if field in POLICE_ACTION_FIELDS:
                note = "Police-action detection signal; excluded from danger score."
            elif field not in DANGER_WEIGHTS:
                note = "Displayed for context; excluded to avoid category overlap."
            result.append(
                MapCrimeStat(
                    category=field,
                    label=CATEGORY_LABELS[field],
                    count=count,
                    danger_weight=DANGER_WEIGHTS.get(field),
                    counts_toward_danger_score=field in DANGER_WEIGHTS,
                    signal_note=note,
                )
            )
            if len(result) >= limit:
                break
        return result

    def _scored_count(self, profile: StationProfile) -> int:
        return sum(
            sanitize_count(profile.counts.get(field))
            for field in DANGER_WEIGHTS
        )

    def _to_cell(self, profile: StationProfile) -> HeatmapCell | None:
        if profile.latitude is None or profile.longitude is None:
            return None
        return HeatmapCell(
            id=f"{profile.area_code}-{_slug(profile.year)}",
            latitude=profile.latitude,
            longitude=profile.longitude,
            label=profile.station,
            reported_crimes=self._scored_count(profile),
            relative_intensity=round(profile.danger_score / 100, 4),
            resolution="police_station_annual_aggregate",
            source_id=DATASET_SOURCE_ID,
            year=profile.year,
            local_municipality=profile.local_municipality or None,
            district_municipality=profile.district_municipality or None,
            danger_score=profile.danger_score,
            safety_score=profile.safety_score,
            risk_band=profile.risk_band,
            color=profile.color,
            confidence=profile.confidence,
            top_crimes=self._top_crimes(profile),
            quality_flags=list(profile.quality_flags),
        )

    def heatmap(
        self,
        bbox: tuple[float, float, float, float],
        zoom: int,
        year: str | None = None,
        limit: int = 1500,
    ) -> HeatmapResponse | None:
        selected_year = self._resolve_year(year)
        if selected_year is None:
            return None
        west, south, east, north = bbox
        cells: list[HeatmapCell] = []
        for profile in self._profiles_by_year[selected_year]:
            if profile.latitude is None or profile.longitude is None:
                continue
            if (
                west <= profile.longitude <= east
                and south <= profile.latitude <= north
            ):
                cell = self._to_cell(profile)
                if cell is not None:
                    cells.append(cell)

        cells.sort(key=lambda item: item.danger_score or 0, reverse=True)
        cells = cells[:limit]
        return HeatmapResponse(
            bbox=bbox,
            zoom=zoom,
            cells=cells,
            normalization=(
                "Danger score is a severity-weighted empirical percentile "
                "relative to police stations in the same financial year."
            ),
            caveats=[
                "Map anchors are police-station annual aggregates, not incident pins.",
                "Scores are comparative burden signals, not per-capita crime rates.",
                "Police-action offences do not contribute to the danger score.",
                "Aggravated-robbery subtypes are excluded from scoring to prevent double counting.",
            ],
            year=selected_year,
            source_id=DATASET_SOURCE_ID,
            model_version=MODEL_VERSION,
            legend=[
                HeatmapLegendItem(
                    band="green",
                    min_score=0,
                    max_score=44.99,
                    color="#22C55E",
                    meaning="Lower relative danger burden for the selected year.",
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
        if selected_year is None:
            return None
        code = _slug(area_code)
        if selected_year == "2025/2026":
            code = STATION_ALIASES_2025_26.get(code, code)
        profile = self._profiles_by_year_code.get((selected_year, code))
        if profile is None:
            return None
        return AreaStatsResponse(
            area_code=profile.area_code,
            area_name=profile.station,
            area_type="police_station",
            period=selected_year,
            total_reported_crimes=self._scored_count(profile),
            previous_period_total=None,
            latest_quarter_total=None,
            latest_quarter_previous_year=None,
            top_categories=[
                CrimeCategoryStat(category=item.label, count=item.count)
                for item in self._top_crimes(profile)
            ],
            source_id=DATASET_SOURCE_ID,
            source_url=DATASET_URL,
            data_resolution="annual police-station aggregate",
            caveats=[
                "Total shown is the selected non-overlapping scoring basket, not every dataset column summed together.",
                "The dataset records charges/counts rather than unique incidents or victims.",
                "This is not a population-normalized rate.",
            ],
        )

    def safety_signal(
        self,
        area_code: str,
        year: str | None = None,
    ) -> SafetySignalResponse | None:
        selected_year = self._resolve_year(year)
        if selected_year is None:
            return None
        code = _slug(area_code)
        if selected_year == "2025/2026":
            code = STATION_ALIASES_2025_26.get(code, code)
        profile = self._profiles_by_year_code.get((selected_year, code))
        if profile is None:
            return None
        return SafetySignalResponse(
            area_code=profile.area_code,
            area_name=profile.station,
            status="available",
            score=profile.safety_score,
            confidence=profile.confidence,
            period=selected_year,
            explanation=[
                "Safety score is 100 minus the comparative danger score.",
                "Danger uses severity-weighted station percentiles within the same financial year.",
                "The score is not population-normalized and is not a guarantee of personal safety.",
            ],
            source_ids=[DATASET_SOURCE_ID],
            danger_score=profile.danger_score,
            risk_band=profile.risk_band,
            color=profile.color,
            top_crimes=self._top_crimes(profile),
            model_version=MODEL_VERSION,
        )

    def search(
        self,
        query: str,
        year: str | None = None,
        limit: int = 20,
    ) -> list[MapSearchResult]:
        selected_year = self._resolve_year(year)
        if selected_year is None:
            return []
        needle = query.strip().lower()
        if not needle:
            return []

        matches: list[tuple[int, StationProfile]] = []
        alias_target = None
        if selected_year == "2025/2026":
            alias_target = STATION_ALIASES_2025_26.get(_slug(query))
        for profile in self._profiles_by_year[selected_year]:
            station = profile.station.lower()
            municipality = profile.local_municipality.lower()
            district = profile.district_municipality.lower()
            alias_match = alias_target is not None and profile.area_code == alias_target
            if (
                needle not in station
                and needle not in municipality
                and needle not in district
                and not alias_match
            ):
                continue
            priority = 0 if station == needle else 1 if station.startswith(needle) else 2
            matches.append((priority, profile))

        matches.sort(
            key=lambda item: (
                item[0],
                -(item[1].danger_score),
                item[1].station,
            )
        )

        results: list[MapSearchResult] = []
        for _, profile in matches:
            if profile.latitude is None or profile.longitude is None:
                continue
            results.append(
                MapSearchResult(
                    result_type="police_station",
                    id=profile.area_code,
                    name=profile.station,
                    latitude=profile.latitude,
                    longitude=profile.longitude,
                    subtitle=" · ".join(
                        part
                        for part in [
                            profile.local_municipality,
                            profile.district_municipality,
                        ]
                        if part
                    ),
                    color=profile.color,
                    year=profile.year,
                    danger_score=profile.danger_score,
                    safety_score=profile.safety_score,
                    risk_band=profile.risk_band,
                    top_crimes=self._top_crimes(profile, limit=3),
                )
            )
            if len(results) >= limit:
                break
        return results

    def status(self) -> DatasetStatusResponse:
        latest = self.latest_year
        latest_profiles = self._profiles_by_year.get(latest or "", [])
        mappable = sum(
            1
            for item in latest_profiles
            if item.latitude is not None and item.longitude is not None
        )
        matches_v14_signature = (
            self.available
            and len(self._rows) == EXPECTED_TOTAL_RECORDS
            and latest == EXPECTED_LATEST_YEAR
            and len(latest_profiles) == EXPECTED_LATEST_STATIONS
        )
        return DatasetStatusResponse(
            loaded=self.available,
            source_id=DATASET_SOURCE_ID,
            dataset_version=DATASET_VERSION if matches_v14_signature else "unverified",
            path=self.path.name,
            latest_year=latest,
            years=self.years,
            records=len(self._rows),
            stations_latest_year=len(latest_profiles),
            mappable_latest_year=mappable,
            load_error=self.load_error,
            nationwide_ready=matches_v14_signature,
            model_version=MODEL_VERSION,
            data_mode="raw_csv",
        )
