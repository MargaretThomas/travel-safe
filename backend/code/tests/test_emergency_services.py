from fastapi.testclient import TestClient

from src.main import app

client = TestClient(app)


def test_emergency_services_returns_all_demo_types() -> None:
    response = client.get("/api/v1/emergency-services")

    assert response.status_code == 200
    body = response.json()
    assert body["region"] == "Cape Town demo area"

    service_types = {
        service["service_type"]
        for service in body["services"]
    }
    assert service_types == {
        "healthcare",
        "police",
        "fire",
        "mountain_rescue",
    }

    for service in body["services"]:
        assert service["id"]
        assert service["name"]
        assert -90 <= service["latitude"] <= 90
        assert -180 <= service["longitude"] <= 180
        assert service["source_url"].startswith("https://")


def test_emergency_services_filters_by_type() -> None:
    response = client.get(
        "/api/v1/emergency-services",
        params={"service_type": "fire"},
    )

    assert response.status_code == 200
    services = response.json()["services"]
    assert len(services) == 1
    assert services[0]["service_type"] == "fire"
    assert services[0]["name"] == "Roeland Street Fire Station"


def test_emergency_services_rejects_unknown_type() -> None:
    response = client.get(
        "/api/v1/emergency-services",
        params={"service_type": "not-a-service"},
    )

    assert response.status_code == 422
