from fastapi.testclient import TestClient

from src.main import app

client = TestClient(app)


def test_sources_expose_governance_status() -> None:
    response = client.get("/api/v1/sources")
    assert response.status_code == 200
    by_id = {item["id"]: item for item in response.json()}
    assert by_id["datafirst-saps-annual-v1.4"]["status"] == "active"
    assert by_id["saps"]["status"] == "active"
    assert by_id["safesuburb"]["status"] == "licence_required"
    assert by_id["safetybrief"]["status"] == "reference_only"


def test_woodstock_stats_use_national_annual_data() -> None:
    response = client.get(
        "/api/v1/stats",
        params={"area_code": "woodstock", "year": "2025/2026"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["area_name"].lower() == "woodstock"
    assert body["period"] == "2025/2026"
    assert body["area_type"] == "police_station"
    assert body["source_id"] == "datafirst-saps-annual-v1.4"
    assert "annual police-station aggregate" in body["data_resolution"]


def test_heatmap_returns_multiple_station_aggregates() -> None:
    response = client.get(
        "/api/v1/heatmap",
        params={
            "bbox": "18.40,-33.96,18.50,-33.89",
            "zoom": 12,
            "year": "2025/2026",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body["cells"]) > 1
    assert all(
        cell["resolution"] == "police_station_annual_aggregate"
        for cell in body["cells"]
    )
    assert {item["band"] for item in body["legend"]} == {
        "green",
        "orange",
        "red",
    }
    assert any(
        "not incident pins" in caveat.lower()
        for caveat in body["caveats"]
    )


def test_heatmap_rejects_invalid_bbox() -> None:
    response = client.get(
        "/api/v1/heatmap",
        params={"bbox": "18.5,-33.9,18.4,-34.0"},
    )
    assert response.status_code == 422


def test_safety_signal_returns_calibrated_national_score() -> None:
    response = client.get(
        "/api/v1/areas/woodstock/safety",
        params={"year": "2025/2026"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "available"
    assert body["score"] is not None
    assert body["danger_score"] is not None
    assert body["risk_band"] in {"green", "orange", "red"}
    assert body["model_version"] == "danger-v1.1"


def test_dataset_status_reports_snapshot_mode() -> None:
    response = client.get("/api/v1/dataset/status")
    assert response.status_code == 200
    body = response.json()
    assert body["nationwide_ready"] is True
    assert body["data_mode"] == "derived_snapshot"
    assert body["records"] == 24206
    assert body["stations_latest_year"] == 1174
    assert body["mappable_latest_year"] == 1128


def test_unknown_area_returns_404() -> None:
    response = client.get(
        "/api/v1/stats",
        params={"area_code": "not-a-real-reference-area"},
    )
    assert response.status_code == 404
