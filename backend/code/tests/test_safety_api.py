from fastapi.testclient import TestClient

from src.main import app

client = TestClient(app)


def test_sources_expose_governance_status() -> None:
    response = client.get("/api/v1/sources")

    assert response.status_code == 200
    body = response.json()
    by_id = {item["id"]: item for item in body}

    assert by_id["saps"]["status"] == "active"
    assert by_id["safesuburb"]["status"] == "licence_required"
    assert by_id["safetybrief"]["status"] == "reference_only"


def test_woodstock_stats_are_precinct_level_reference_data() -> None:
    response = client.get("/api/v1/stats", params={"area_code": "woodstock"})

    assert response.status_code == 200
    body = response.json()

    assert body["area_name"] == "Woodstock Precinct"
    assert body["period"] == "Apr 2025-Mar 2026"
    assert body["total_reported_crimes"] == 3541
    assert body["latest_quarter_total"] == 910
    assert body["latest_quarter_previous_year"] == 800
    assert "precinct" in body["data_resolution"].lower()
    assert body["source_id"] == "saps-reference-via-safesuburb"


def test_heatmap_returns_aggregate_context_not_incident_points() -> None:
    response = client.get(
        "/api/v1/heatmap",
        params={
            "bbox": "18.40,-33.96,18.50,-33.89",
            "zoom": 12,
        },
    )

    assert response.status_code == 200
    body = response.json()

    assert len(body["cells"]) == 1
    assert body["cells"][0]["resolution"] == "precinct_aggregate"
    assert body["cells"][0]["reported_crimes"] == 3541
    assert any(
        "not crime-event pins" in caveat.lower()
        for caveat in body["caveats"]
    )


def test_heatmap_rejects_invalid_bbox() -> None:
    response = client.get(
        "/api/v1/heatmap",
        params={"bbox": "18.5,-33.9,18.4,-34.0"},
    )

    assert response.status_code == 422


def test_safety_signal_withholds_unvalidated_score() -> None:
    response = client.get("/api/v1/areas/woodstock/safety")

    assert response.status_code == 200
    body = response.json()

    assert body["status"] == "insufficient_data"
    assert body["score"] is None
    assert body["confidence"] == 0.0


def test_unknown_area_returns_404() -> None:
    response = client.get(
        "/api/v1/stats",
        params={"area_code": "not-a-real-reference-area"},
    )

    assert response.status_code == 404
