import json
from pathlib import Path

from src.core.config import get_setting
from src.models.safety import GoldenSpot, MapSearchResult


class GoldenSpotProvider:
    def __init__(self, path: str | Path | None = None) -> None:
        default_path = (
            Path(__file__).resolve().parents[3] / "data" / "golden-spots.json"
        )
        configured = path or get_setting("GOLDEN_SPOTS_JSON_PATH") or default_path
        self.path = Path(configured).expanduser()
        self.load_error: str | None = None
        self.spots: list[GoldenSpot] = []
        self._load()

    @property
    def available(self) -> bool:
        return self.path.exists() and self.load_error is None

    def _load(self) -> None:
        if not self.path.exists():
            return
        try:
            payload = json.loads(self.path.read_text(encoding="utf-8"))
            raw_spots = payload.get("spots", []) if isinstance(payload, dict) else []
            self.spots = [GoldenSpot.model_validate(item) for item in raw_spots]
        except (OSError, ValueError, TypeError) as exc:
            self.load_error = str(exc)

    def within_bbox(
        self,
        bbox: tuple[float, float, float, float],
        query: str | None = None,
    ) -> list[GoldenSpot]:
        west, south, east, north = bbox
        needle = (query or "").strip().lower()
        return [
            spot
            for spot in self.spots
            if west <= spot.longitude <= east
            and south <= spot.latitude <= north
            and (
                not needle
                or needle in spot.name.lower()
                or needle in spot.category.lower()
                or needle in (spot.local_municipality or "").lower()
                or needle in (spot.district_municipality or "").lower()
            )
        ]

    def search(self, query: str, limit: int = 20) -> list[MapSearchResult]:
        needle = query.strip().lower()
        if not needle:
            return []
        results: list[MapSearchResult] = []
        for spot in self.spots:
            haystack = " ".join(
                [
                    spot.name,
                    spot.category,
                    spot.local_municipality or "",
                    spot.district_municipality or "",
                ]
            ).lower()
            if needle not in haystack:
                continue
            results.append(
                MapSearchResult(
                    result_type="golden_spot",
                    id=spot.id,
                    name=spot.name,
                    latitude=spot.latitude,
                    longitude=spot.longitude,
                    subtitle=spot.category,
                    color=spot.color,
                )
            )
            if len(results) >= limit:
                break
        return results
