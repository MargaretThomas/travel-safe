import csv
import json

from fastapi.testclient import TestClient

from src.api.routes import safety as safety_routes
from src.core.risk_model import CATEGORY_LABELS, DANGER_WEIGHTS
from src.main import app
from src.providers.datafirst import DataFirstCrimeProvider
from src.providers.golden_spots import GoldenSpotProvider
from src.services.safety_service import SafetyService

client = TestClient(app)


def write_dataset(path) -> None:
    fieldnames = [
        "year",
        "station",
        "loc_mn",
        "dc_mn",
        "longitude",
        "latitude",
        *CATEGORY_LABELS.keys(),
    ]

    def row(
        station: str,
        municipality: str,
        district: str,
        longitude: float,
        latitude: float,
        danger_value: int,
        *,
        drug_crime: int = 0,
    ) -> dict[str, object]:
        payload: dict[str, object] = {
            "year": "2025/2026",
            "station": station,
            "loc_mn": municipality,
            "dc_mn": district,
            "longitude": longitude,
            "latitude": latitude,
        }
        for field in CATEGORY_LABELS:
            payload[field] = danger_value if field in DANGER_WEIGHTS else 0
        payload["drug_crime"] = drug_crime
        return payload

    rows = [
        row(
            "Green Point Test",
            "City of Cape Town",
            "City of Cape Town",
            18.40,
            -33.90,
            0,
        ),
        row(
            "Orange Test",
            "Johannesburg",
            "City of Johannesburg",
            28.05,
            -26.20,
            30,
        ),
        row(
            "Red Test",
            "eThekwini",
            "eThekwini",
            31.02,
            -29.85,
            100,
        ),
        row(
            "Police Activity Test",
            "Gqeberha",
            "Nelson Mandela Bay",
            25.60,
            -33.96,
            0,
            drug_crime=5000,
        ),
    ]

    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def test_national_risk_model_assigns_green_orange_red(tmp_path) -> None:
    dataset = tmp_path / "saps.csv"
    write_dataset(dataset)
    provider = DataFirstCrimeProvider(dataset)

    response = provider.heatmap((16.0, -35.0, 33.0, -22.0), zoom=5)

    assert response is not None
    by_name = {cell.label: cell for cell in response.cells}
    assert by_name["Green Point Test"].risk_band == "green"
    assert by_name["Orange Test"].risk_band == "orange"
    assert by_name["Red Test"].risk_band == "red"
    assert by_name["Green Point Test"].color == "#22C55E"
    assert by_name["Orange Test"].color == "#F97316"
    assert by_name["Red Test"].color == "#EF4444"


def test_police_action_volume_does_not_drive_danger_score(tmp_path) -> None:
    dataset = tmp_path / "saps.csv"
    write_dataset(dataset)
    provider = DataFirstCrimeProvider(dataset)

    response = provider.heatmap((16.0, -35.0, 33.0, -22.0), zoom=5)

    assert response is not None
    police = next(
        cell for cell in response.cells if cell.label == "Police Activity Test"
    )
    assert police.risk_band == "green"
    drug = next(item for item in police.top_crimes if item.category == "drug_crime")
    assert drug.count == 5000
    assert drug.counts_toward_danger_score is False


def test_search_connects_station_and_municipality_to_map(tmp_path) -> None:
    dataset = tmp_path / "saps.csv"
    write_dataset(dataset)
    provider = DataFirstCrimeProvider(dataset)

    results = provider.search("Cape Town")

    assert len(results) == 1
    assert results[0].name == "Green Point Test"
    assert results[0].result_type == "police_station"


def test_dataset_status_reports_loaded_coverage(tmp_path) -> None:
    dataset = tmp_path / "saps.csv"
    write_dataset(dataset)
    provider = DataFirstCrimeProvider(dataset)

    status = provider.status()

    assert status.loaded is True
    assert status.latest_year == "2025/2026"
    assert status.records == 4
    assert status.stations_latest_year == 4
    assert status.mappable_latest_year == 4
    assert status.nationwide_ready is False


def test_golden_spot_is_gold_and_searchable(tmp_path) -> None:
    golden = tmp_path / "golden.json"
    golden.write_text(
        json.dumps(
            {
                "spots": [
                    {
                        "id": "known-place-1",
                        "name": "Known Local Place",
                        "category": "community_landmark",
                        "latitude": -33.92,
                        "longitude": 18.43,
                        "source_label": "Team curated",
                        "verified": True,
                    }
                ]
            }
        ),
        encoding="utf-8",
    )
    provider = GoldenSpotProvider(golden)

    results = provider.search("Known")

    assert len(results) == 1
    assert results[0].result_type == "golden_spot"
    assert results[0].color == "#D4AF37"


def test_fastapi_heatmap_uses_national_provider_when_loaded(
    tmp_path,
    monkeypatch,
) -> None:
    dataset = tmp_path / "saps.csv"
    write_dataset(dataset)
    service = SafetyService(
        national_provider=DataFirstCrimeProvider(dataset),
        golden_provider=GoldenSpotProvider(tmp_path / "missing.json"),
    )
    monkeypatch.setattr(safety_routes, "service", service)

    response = client.get(
        "/api/v1/heatmap",
        params={
            "bbox": "16,-35,33,-22",
            "zoom": 5,
            "year": "2025/2026",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert len(body["cells"]) == 4
    assert body["year"] == "2025/2026"
    assert {item["band"] for item in body["legend"]} == {
        "green",
        "orange",
        "red",
        "gold",
    }


def test_invalid_year_does_not_fall_back_to_reference_fixture(
    tmp_path,
    monkeypatch,
) -> None:
    dataset = tmp_path / "saps.csv"
    write_dataset(dataset)
    service = SafetyService(
        national_provider=DataFirstCrimeProvider(dataset),
        golden_provider=GoldenSpotProvider(tmp_path / "missing.json"),
    )
    monkeypatch.setattr(safety_routes, "service", service)

    response = client.get(
        "/api/v1/heatmap",
        params={"bbox": "18.3,-34.1,18.7,-33.7", "year": "1900/1901"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Requested year is not available"


def test_incomplete_dataset_is_not_claimed_as_v14_nationwide(tmp_path) -> None:
    dataset = tmp_path / "saps.csv"
    write_dataset(dataset)
    provider = DataFirstCrimeProvider(dataset)

    status = provider.status()

    assert status.loaded is True
    assert status.dataset_version == "unverified"
    assert status.nationwide_ready is False


def test_public_status_does_not_expose_dataset_filesystem_path(tmp_path) -> None:
    secret_path = tmp_path / "private" / "crime.csv"
    provider = DataFirstCrimeProvider(secret_path)

    status = provider.status()
    serialized = status.model_dump_json()

    assert status.loaded is False
    assert str(secret_path) not in serialized
    assert status.load_error == "National DataFirst CSV is not installed or configured."
