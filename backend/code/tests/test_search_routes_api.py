from fastapi.testclient import TestClient

from src.main import app

client = TestClient(app)


def test_unified_search_returns_exact_station_first() -> None:
    response = client.get(
        "/api/v1/search",
        params={"q": "mfuleni", "year": "2025/2026"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["results"]
    assert body["results"][0]["result_type"] == "police_station"
    assert body["results"][0]["name"].lower() == "mfuleni"
    assert body["results"][0]["risk_band"] == "red"


def test_unified_search_includes_halo_without_changing_safety() -> None:
    response = client.get(
        "/api/v1/search",
        params={"q": "Company's Garden", "year": "2025/2026"},
    )

    assert response.status_code == 200
    body = response.json()
    halo = next(
        item
        for item in body["results"]
        if item["result_type"] == "halo"
    )

    assert halo["name"] == "Company's Garden"
    assert halo["danger_score"] is None
    assert halo["safety_score"] is None
    assert "does not change" in halo["caution"]


def test_route_analysis_ranks_lower_exposure_candidate() -> None:
    response = client.post(
        "/api/v1/routes/analyse",
        json={
            "year": "2025/2026",
            "candidates": [
                {
                    "id": "mfuleni-context",
                    "profile": "walking",
                    "distance_meters": 1000,
                    "duration_seconds": 800,
                    "coordinates": [
                        {
                            "latitude": -33.98106,
                            "longitude": 18.68742,
                        },
                        {
                            "latitude": -33.98200,
                            "longitude": 18.69000,
                        },
                    ],
                },
                {
                    "id": "camps-bay-context",
                    "profile": "walking",
                    "distance_meters": 1000,
                    "duration_seconds": 800,
                    "coordinates": [
                        {
                            "latitude": -33.95604,
                            "longitude": 18.37672,
                        },
                        {
                            "latitude": -33.95700,
                            "longitude": 18.37900,
                        },
                    ],
                },
            ],
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["lower_risk_route_id"] == "camps-bay-context"
    assert body["model_version"] == "route-context-v1"

    by_id = {route["id"]: route for route in body["routes"]}
    assert (
        by_id["camps-bay-context"]["exposure_score"]
        < by_id["mfuleni-context"]["exposure_score"]
    )
    assert by_id["mfuleni-context"]["red_exposure_ratio"] > 0
    assert any(
        "not a safety guarantee" in caveat.lower()
        for caveat in body["caveats"]
    )


def test_route_analysis_rejects_unsupported_year() -> None:
    response = client.post(
        "/api/v1/routes/analyse",
        json={
            "year": "1900/1901",
            "candidates": [
                {
                    "id": "route-a",
                    "profile": "walking",
                    "distance_meters": 100,
                    "duration_seconds": 100,
                    "coordinates": [
                        {"latitude": -33.92, "longitude": 18.42},
                        {"latitude": -33.921, "longitude": 18.421},
                    ],
                }
            ],
        },
    )

    assert response.status_code == 404
    assert (
        response.json()["detail"]
        == "Requested safety-data year is not available"
    )
