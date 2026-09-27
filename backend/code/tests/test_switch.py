from datetime import timedelta

import pytest

from deadman.switch import (
    DAY_MINUTES,
    HOUR_MINUTES,
    MAX_INTERVAL_MINUTES,
    compute_deadline,
    days_to_minutes,
    is_expired,
    seconds_remaining,
    validate_interval_minutes,
)
from tests.conftest import START

SUPPORTED = [
    HOUR_MINUTES,
    2 * HOUR_MINUTES,
    6 * HOUR_MINUTES,
    12 * HOUR_MINUTES,
    DAY_MINUTES,
    2 * DAY_MINUTES,
    3 * DAY_MINUTES,
    7 * DAY_MINUTES,
    14 * DAY_MINUTES,
    30 * DAY_MINUTES,
    60 * DAY_MINUTES,
    90 * DAY_MINUTES,
    180 * DAY_MINUTES,
    MAX_INTERVAL_MINUTES,
]


def test_deadline_is_last_check_in_plus_interval():
    assert compute_deadline(START, 7 * DAY_MINUTES) == START + timedelta(days=7)


def test_hourly_deadline_is_an_hour_out():
    assert compute_deadline(START, HOUR_MINUTES) == START + timedelta(hours=1)


@pytest.mark.parametrize("minutes", SUPPORTED)
def test_supported_presets_are_valid(minutes):
    assert validate_interval_minutes(minutes) == minutes


@pytest.mark.parametrize("minutes", [0, 1, 59, -60, MAX_INTERVAL_MINUTES + 1])
def test_out_of_range_intervals_are_rejected(minutes):
    with pytest.raises(ValueError):
        validate_interval_minutes(minutes)


@pytest.mark.parametrize(("days", "minutes"), [(1, DAY_MINUTES), (7, 7 * DAY_MINUTES), (365, MAX_INTERVAL_MINUTES)])
def test_days_convert_to_minutes(days, minutes):
    assert days_to_minutes(days) == minutes


@pytest.mark.parametrize("days", [0, -1, 366])
def test_out_of_range_days_are_rejected(days):
    with pytest.raises(ValueError):
        days_to_minutes(days)


def test_not_expired_before_deadline():
    deadline = compute_deadline(START, HOUR_MINUTES)
    assert not is_expired(deadline, deadline - timedelta(seconds=1))


def test_not_expired_exactly_at_deadline():
    deadline = compute_deadline(START, HOUR_MINUTES)
    assert not is_expired(deadline, deadline)


def test_expired_after_deadline():
    deadline = compute_deadline(START, HOUR_MINUTES)
    assert is_expired(deadline, deadline + timedelta(microseconds=1))


def test_no_deadline_never_expires():
    assert not is_expired(None, START)
    assert seconds_remaining(None, START) is None


def test_seconds_remaining_goes_negative_after_deadline():
    deadline = START + timedelta(hours=1)
    assert seconds_remaining(deadline, START) == 3600
    assert seconds_remaining(deadline, START + timedelta(hours=2)) == -3600
