import json
from pathlib import Path

from src.models.emergency import EmergencyNumber, EmergencyNumbersResponse


class EmergencyNumbersProvider:
    def __init__(self, path: str | Path | None = None) -> None:
        default_path = (
            Path(__file__).resolve().parents[3]
            / "data"
            / "emergency-numbers.json"
        )
        self.path = Path(path or default_path)
        self._response = self._load()

    def _load(self) -> EmergencyNumbersResponse:
        payload = json.loads(self.path.read_text(encoding="utf-8"))
        numbers = [
            EmergencyNumber.model_validate(item)
            for item in payload.get("numbers", [])
        ]
        return EmergencyNumbersResponse(
            region=str(payload.get("region", "Cape Town / Western Cape demo")),
            numbers=numbers,
        )

    def list_numbers(
        self,
        service_type: str | None = None,
    ) -> EmergencyNumbersResponse:
        if service_type is None:
            return self._response
        return EmergencyNumbersResponse(
            region=self._response.region,
            numbers=[
                item
                for item in self._response.numbers
                if item.service_type == service_type
            ],
        )
