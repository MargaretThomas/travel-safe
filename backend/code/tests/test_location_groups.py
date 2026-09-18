from fastapi.testclient import TestClient

from src.main import app

client = TestClient(app)


def create_group() -> tuple[str, str]:
    response = client.post("/api/v1/location-groups")

    assert response.status_code == 200
    body = response.json()
    return body["group_code"], body["group_key"]


def test_create_group_returns_short_code_and_secret_key() -> None:
    group_code, group_key = create_group()

    assert len(group_code) == 6
    assert group_code.isalnum()
    assert len(group_key) >= 20


def test_group_cannot_be_read_with_code_alone() -> None:
    group_code, _ = create_group()

    response = client.get(
        f"/api/v1/location-groups/{group_code}/locations",
    )

    assert response.status_code in {404, 422}


def test_wrong_group_key_is_indistinguishable_from_missing_group() -> None:
    group_code, _ = create_group()

    response = client.get(
        f"/api/v1/location-groups/{group_code}/locations",
        headers={"X-Group-Key": "wrong-secret"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Location group not found"


def test_join_publish_and_poll_latest_location() -> None:
    group_code, group_key = create_group()
    headers = {"X-Group-Key": group_key}

    join = client.post(
        f"/api/v1/location-groups/{group_code}/join",
        headers=headers,
        json={"client_id": "client-alice", "display_name": "Alice"},
    )
    assert join.status_code == 200

    update = client.put(
        (
            f"/api/v1/location-groups/{group_code}/members/"
            "client-alice/location"
        ),
        headers=headers,
        json={"latitude": -33.9249, "longitude": 18.4241},
    )
    assert update.status_code == 200

    snapshot = client.get(
        f"/api/v1/location-groups/{group_code}/locations",
        headers=headers,
    )
    assert snapshot.status_code == 200
    body = snapshot.json()

    assert body["group_code"] == group_code
    assert body["stale_after_seconds"] == 120
    assert body["polling_interval_seconds"] == 15
    assert len(body["members"]) == 1
    assert body["members"][0]["client_id"] == "client-alice"
    assert body["members"][0]["stale"] is False
    assert body["members"][0]["server_timestamp"]


def test_unjoined_client_cannot_publish_location() -> None:
    group_code, group_key = create_group()

    response = client.put(
        f"/api/v1/location-groups/{group_code}/members/unknown/location",
        headers={"X-Group-Key": group_key},
        json={"latitude": -33.9, "longitude": 18.4},
    )

    assert response.status_code == 404
