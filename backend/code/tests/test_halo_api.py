from fastapi.testclient import TestClient

from src.api.routes import halo as halo_routes
from src.main import app
from src.services.halo_service import HaloService

client = TestClient(app)


def reset_halo_service(monkeypatch) -> HaloService:
    service = HaloService()
    monkeypatch.setattr(halo_routes, "service", service)
    return service


def test_public_halo_list_uses_canonical_name(monkeypatch) -> None:
    reset_halo_service(monkeypatch)

    response = client.get("/api/v1/halo")

    assert response.status_code == 200
    body = response.json()
    assert body["count"] >= 3
    assert all("community" in item for item in body["items"])
    assert all(
        "danger or safety score" in item["caution"]
        for item in body["items"]
    )


def test_halo_submission_requires_temporary_client_id(monkeypatch) -> None:
    reset_halo_service(monkeypatch)

    response = client.post(
        "/api/v1/halo",
        json={
            "name": "Community Viewpoint",
            "description": "A locally recommended viewpoint.",
            "location_label": "Cape Town",
            "latitude": -33.92,
            "longitude": 18.42,
        },
    )

    assert response.status_code == 401


def test_submitter_can_enable_or_disable_rating(monkeypatch) -> None:
    reset_halo_service(monkeypatch)
    headers = {"X-Client-ID": "device-owner-1"}

    created = client.post(
        "/api/v1/halo",
        headers=headers,
        json={
            "name": "Community Viewpoint",
            "description": "A locally recommended viewpoint.",
            "location_label": "Cape Town",
            "latitude": -33.92,
            "longitude": 18.42,
            "rating_enabled": True,
        },
    )
    assert created.status_code == 201
    halo_id = created.json()["id"]

    disabled = client.put(
        f"/api/v1/halo/{halo_id}/rating-settings",
        headers=headers,
        json={"enabled": False},
    )

    assert disabled.status_code == 200
    assert disabled.json()["community"]["rating_enabled"] is False


def test_other_client_cannot_change_rating_settings(monkeypatch) -> None:
    reset_halo_service(monkeypatch)
    created = client.post(
        "/api/v1/halo",
        headers={"X-Client-ID": "device-owner-1"},
        json={
            "name": "Community Viewpoint",
            "description": "A locally recommended viewpoint.",
            "location_label": "Cape Town",
            "latitude": -33.92,
            "longitude": 18.42,
        },
    )
    halo_id = created.json()["id"]

    response = client.put(
        f"/api/v1/halo/{halo_id}/rating-settings",
        headers={"X-Client-ID": "different-client"},
        json={"enabled": False},
    )

    assert response.status_code == 404


def test_rating_is_idempotent_per_client(monkeypatch) -> None:
    reset_halo_service(monkeypatch)
    halo_id = "halo-companys-garden"
    headers = {"X-Client-ID": "device-rater-1"}

    first = client.put(
        f"/api/v1/halo/{halo_id}/rating",
        headers=headers,
        json={"rating": 4, "liked": True, "visited": False},
    )
    assert first.status_code == 200

    second = client.put(
        f"/api/v1/halo/{halo_id}/rating",
        headers=headers,
        json={"rating": 5, "liked": False, "visited": False},
    )
    assert second.status_code == 200

    community = second.json()["halo"]["community"]
    assert community["rating_count"] == 1
    assert community["rating_average"] == 5
    assert community["like_count"] == 0
    assert community["visitability_score"] == 100


def test_nearby_visit_can_be_proximity_verified(monkeypatch) -> None:
    reset_halo_service(monkeypatch)

    response = client.put(
        "/api/v1/halo/halo-companys-garden/rating",
        headers={"X-Client-ID": "device-visitor-1"},
        json={
            "rating": 5,
            "liked": True,
            "visited": True,
            "visit_latitude": -33.9254,
            "visit_longitude": 18.4199,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["proximity_verified"] is True
    assert (
        body["halo"]["community"]["proximity_verified_visit_count"]
        == 1
    )


def test_far_away_visit_is_not_proximity_verified(monkeypatch) -> None:
    reset_halo_service(monkeypatch)

    response = client.put(
        "/api/v1/halo/halo-companys-garden/rating",
        headers={"X-Client-ID": "device-visitor-2"},
        json={
            "rating": 4,
            "liked": True,
            "visited": True,
            "visit_latitude": -26.2041,
            "visit_longitude": 28.0473,
        },
    )

    assert response.status_code == 200
    assert response.json()["proximity_verified"] is False


def test_bbox_filters_halo_without_changing_visitability(monkeypatch) -> None:
    reset_halo_service(monkeypatch)

    response = client.get(
        "/api/v1/halo",
        params={"bbox": "18.40,-33.95,18.44,-33.89"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["count"] >= 1
    assert all(
        18.40 <= item["longitude"] <= 18.44
        for item in body["items"]
    )
