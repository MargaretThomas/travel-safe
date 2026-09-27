import pytest

PROTECTED = [
    ("get", "/api/v1/me"),
    ("patch", "/api/v1/me"),
    ("delete", "/api/v1/me"),
    ("post", "/api/v1/auth/logout"),
    ("post", "/api/v1/check-ins"),
    ("get", "/api/v1/check-ins/latest"),
    ("get", "/api/v1/check-ins/status"),
    ("get", "/api/v1/contacts"),
    ("post", "/api/v1/contacts"),
    ("post", "/api/v1/contacts/test-message"),
    ("get", "/api/v1/contacts/abc"),
    ("put", "/api/v1/contacts/abc"),
    ("delete", "/api/v1/contacts/abc"),
    ("post", "/api/v1/locations"),
    ("get", "/api/v1/locations/last"),
    ("get", "/api/v1/switch/status"),
    ("get", "/api/v1/switch/deadline"),
    ("get", "/api/v1/switch/events/latest"),
]


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


@pytest.mark.parametrize(("method", "path"), PROTECTED)
def test_user_endpoints_require_authentication(client, method, path):
    response = getattr(client, method)(path)
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


@pytest.mark.parametrize(("method", "path"), PROTECTED)
def test_user_endpoints_reject_bad_tokens(client, method, path):
    response = getattr(client, method)(path, headers={"Authorization": "Bearer at_forged"})
    assert response.status_code == 401


def test_register_refresh_logout_flow(client, register, clock):
    account = register()
    assert client.get("/api/v1/me", headers=account.headers).json()["name"] == "Thandi"

    clock.advance(days=3651)
    assert client.get("/api/v1/me", headers=account.headers).status_code == 401
    refreshed = client.post("/api/v1/auth/refresh", json={"refresh_token": account.refresh_token})
    assert refreshed.status_code == 200
    headers = {"Authorization": f"Bearer {refreshed.json()['access_token']}"}
    assert client.get("/api/v1/me", headers=headers).status_code == 200

    assert client.post("/api/v1/auth/logout", headers=headers).status_code == 204
    assert client.get("/api/v1/me", headers=headers).status_code == 401

    login = client.post("/api/v1/auth/login", json={"user_id": account.user_id, "account_key": account.account_key})
    assert login.status_code == 200


def test_profile_update(client, register):
    account = register()
    response = client.patch("/api/v1/me", json={"name": "  Thandi M  ", "timezone": "Europe/London"}, headers=account.headers)
    assert response.json()["name"] == "Thandi M"
    assert response.json()["timezone"] == "Europe/London"
    assert client.patch("/api/v1/me", json={"name": "   "}, headers=account.headers).status_code == 422


@pytest.mark.parametrize(
    ("minutes", "days"),
    [(1440, 1), (10080, 7), (43200, 30), (525600, 365), (720, 1), (60, 1)],
)
def test_register_accepts_interval_in_minutes(client, minutes, days):
    """The installed app build sends the interval in minutes rather than days."""
    response = client.post(
        "/api/v1/auth/register",
        json={"name": "Sibongiseni", "check_in_interval_minutes": minutes, "timezone": "Africa/Johannesburg"},
    )
    assert response.status_code == 201, response.text
    headers = {"Authorization": f"Bearer {response.json()['tokens']['access_token']}"}
    assert client.get("/api/v1/me", headers=headers).json()["check_in_interval_days"] == days


def test_profile_update_accepts_interval_in_minutes(client, register):
    account = register()
    response = client.patch("/api/v1/me", json={"check_in_interval_minutes": 43200}, headers=account.headers)
    assert response.status_code == 200, response.text
    assert response.json()["check_in_interval_days"] == 30


def test_register_accepts_both_interval_spellings_when_they_agree(client):
    response = client.post(
        "/api/v1/auth/register",
        json={"name": "Thandi", "check_in_interval_days": 7, "check_in_interval_minutes": 10080},
    )
    assert response.status_code == 201, response.text


def test_register_rejects_conflicting_interval_spellings(client):
    response = client.post(
        "/api/v1/auth/register",
        json={"name": "Thandi", "check_in_interval_days": 7, "check_in_interval_minutes": 43200},
    )
    assert response.status_code == 422
    error = response.json()["error"]
    assert error["field"] == "check_in_interval_minutes"


def test_register_requires_an_interval(client):
    response = client.post("/api/v1/auth/register", json={"name": "Thandi"})
    assert response.status_code == 422
    assert response.json()["error"]["field"] == "check_in_interval_days"


def test_register_rejects_interval_beyond_a_year(client):
    response = client.post("/api/v1/auth/register", json={"name": "Thandi", "check_in_interval_minutes": 525601})
    assert response.status_code == 422
    assert response.json()["error"]["field"] == "check_in_interval_minutes"


@pytest.mark.parametrize(
    ("payload", "field"),
    [
        ({"name": "Thandi", "check_in_interval_days": 0}, "check_in_interval_days"),
        ({"name": "Thandi", "check_in_interval_days": 366}, "check_in_interval_days"),
        ({"name": "", "check_in_interval_days": 7}, "name"),
        ({"check_in_interval_days": 7}, "name"),
    ],
)
def test_invalid_registration_uses_the_shared_error_envelope(client, payload, field):
    """A rejected field has to be nameable, or the app can only say "failed with 422"."""
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "invalid_request"
    assert error["field"] == field
    assert error["message"]


def test_status_reports_contact_count_and_server_time(client, register, add_contact, check_in):
    account = register()
    add_contact(account)
    check_in(account)
    status = client.get("/api/v1/switch/status", headers=account.headers).json()
    assert status["contact_count"] == 1
    assert status["seconds_remaining"] == 86400
    assert status["deadline_passed"] is False
    assert status["latest_event"] is None
    assert status["server_time"].endswith("Z")


def test_location_batch_limits(client, register, clock):
    account = register()
    point = {"latitude": 0, "longitude": 0, "recorded_at": clock().isoformat()}
    too_many = client.post("/api/v1/locations", json={"points": [point] * 101}, headers=account.headers)
    assert too_many.status_code == 422
    bad = client.post(
        "/api/v1/locations", json={"points": [{**point, "latitude": 91}]}, headers=account.headers
    )
    assert bad.status_code == 422
