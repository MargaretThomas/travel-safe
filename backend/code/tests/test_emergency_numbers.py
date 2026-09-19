from fastapi.testclient import TestClient

from src.main import app

client = TestClient(app)


def test_emergency_numbers_returns_all_picker_categories() -> None:
    response = client.get("/api/v1/emergency-numbers")

    assert response.status_code == 200
    body = response.json()
    service_types = {item["service_type"] for item in body["numbers"]}

    assert service_types == {
        "healthcare",
        "police",
        "fire",
        "mountain_rescue",
    }
    assert all(item["phone_number"] for item in body["numbers"])
    assert all(item["source_url"].startswith("https://") for item in body["numbers"])


def test_emergency_numbers_can_filter_by_service_type() -> None:
    response = client.get(
        "/api/v1/emergency-numbers",
        params={"service_type": "police"},
    )

    assert response.status_code == 200
    body = response.json()

    assert len(body["numbers"]) == 1
    assert body["numbers"][0]["service_type"] == "police"
    assert body["numbers"][0]["phone_number"] == "10111"


def test_unknown_service_type_returns_empty_list() -> None:
    response = client.get(
        "/api/v1/emergency-numbers",
        params={"service_type": "not-a-service"},
    )

    assert response.status_code == 200
    assert response.json()["numbers"] == []


def test_location_emergency_numbers_inside_cape_town() -> None:
    response = client.get(
        "/api/v1/emergency/numbers",
        params={"lat": -33.9249, "lon": 18.4241},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["in_cape_town"] is True
    assert body["police"]["number"] == "10111"
    assert body["fire"]["number"] == "112"
    assert body["hospital"]["number"] == "0214807700"


def test_location_emergency_numbers_outside_cape_town() -> None:
    response = client.get(
        "/api/v1/emergency/numbers",
        params={"lat": -26.2041, "lon": 28.0473},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["in_cape_town"] is False
    assert body["hospital"]["number"] == "10177"


def test_location_emergency_numbers_validates_coordinates() -> None:
    response = client.get(
        "/api/v1/emergency/numbers",
        params={"lat": 95, "lon": 18.4241},
    )

    assert response.status_code == 422
