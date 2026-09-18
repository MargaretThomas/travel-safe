import csv

from fastapi.testclient import TestClient

from src.api.routes import safety as safety_routes
from src.core.risk_model import CATEGORY_LABELS, DANGER_WEIGHTS
from src.main import app
from src.providers.datafirst import DataFirstCrimeProvider
from src.providers.snapshot import SnapshotCrimeProvider
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


def test_incomplete_dataset_is_not_claimed_as_v14_nationwide(tmp_path) -> None:
    dataset = tmp_path / "saps.csv"
    write_dataset(dataset)
    provider = DataFirstCrimeProvider(dataset)

    status = provider.status()

    assert status.loaded is True
    assert status.dataset_version == "unverified"
    assert status.nationwide_ready is False
    assert status.data_mode == "raw_csv"


def test_public_status_does_not_expose_dataset_filesystem_path(tmp_path) -> None:
    secret_path = tmp_path / "private" / "crime.csv"
    provider = DataFirstCrimeProvider(secret_path)

    status = provider.status()
    serialized = status.model_dump_json()

    assert status.loaded is False
    assert str(secret_path) not in serialized
    assert status.load_error == "National DataFirst CSV is not installed or configured."


def test_bundled_snapshot_matches_validated_v14_signature() -> None:
    provider = SnapshotCrimeProvider()

    status = provider.status()

    assert status.loaded is True
    assert status.nationwide_ready is True
    assert status.dataset_version == "1.4"
    assert status.latest_year == "2025/2026"
    assert status.records == 24206
    assert status.stations_latest_year == 1174
    assert status.mappable_latest_year == 1128
    assert status.data_mode == "derived_snapshot"
    assert status.model_version == "danger-v1.1"


def test_bundled_snapshot_heatmap_has_only_safety_bands() -> None:
    provider = SnapshotCrimeProvider()

    response = provider.heatmap(
        (18.2, -34.2, 19.0, -33.5),
        zoom=10,
        year="2025/2026",
    )

    assert response is not None
    assert response.cells
    assert {item.band for item in response.legend} == {
        "green",
        "orange",
        "red",
    }
    assert all(cell.risk_band in {"green", "orange", "red"} for cell in response.cells)


def test_incomplete_raw_file_cannot_override_verified_snapshot(tmp_path) -> None:
    dataset = tmp_path / "saps.csv"
    write_dataset(dataset)
    service = SafetyService(
        national_provider=DataFirstCrimeProvider(dataset),
        snapshot_provider=SnapshotCrimeProvider(),
    )

    status = service.dataset_status()

    assert status.data_mode == "derived_snapshot"
    assert status.nationwide_ready is True
    assert status.records == 24206


def test_invalid_year_does_not_fall_back_to_other_data(monkeypatch) -> None:
    service = SafetyService(
        national_provider=DataFirstCrimeProvider("/definitely/missing.csv"),
        snapshot_provider=SnapshotCrimeProvider(),
    )
    monkeypatch.setattr(safety_routes, "service", service)

    response = client.get(
        "/api/v1/heatmap",
        params={
            "bbox": "18.3,-34.1,18.7,-33.7",
            "year": "1900/1901",
        },
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Requested year is not available"


def test_api_uses_bundled_snapshot_by_default(monkeypatch) -> None:
    service = SafetyService(
        national_provider=DataFirstCrimeProvider("/definitely/missing.csv"),
        snapshot_provider=SnapshotCrimeProvider(),
    )
    monkeypatch.setattr(safety_routes, "service", service)

    response = client.get(
        "/api/v1/heatmap",
        params={
            "bbox": "18.2,-34.2,19.0,-33.5",
            "zoom": 10,
            "year": "2025/2026",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["source_id"] == "datafirst-saps-annual-v1.4"
    assert body["model_version"] == "danger-v1.1"
    assert len(body["cells"]) > 0


def test_snapshot_station_search_connects_area_to_map() -> None:
    provider = SnapshotCrimeProvider()

    results = provider.search("Mfuleni", year="2025/2026")

    assert results
    assert results[0].result_type == "police_station"
    assert results[0].name.lower() == "mfuleni"
