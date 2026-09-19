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
