from datetime import timedelta

import pytest

from deadman.switch import (
    compute_deadline,
    interval_days_from_minutes,
    is_expired,
    seconds_remaining,
    validate_interval,
)
from tests.conftest import START


def test_deadline_is_last_check_in_plus_interval():
    assert compute_deadline(START, 7) == START + timedelta(days=7)


@pytest.mark.parametrize("days", [1, 2, 3, 7, 14, 30, 60, 90, 180, 365])
def test_supported_presets_are_valid(days):
    assert validate_interval(days) == days


@pytest.mark.parametrize("days", [0, -1, 366])
def test_out_of_range_intervals_are_rejected(days):
    with pytest.raises(ValueError):
        validate_interval(days)


@pytest.mark.parametrize(
    ("minutes", "days"),
    [(1440, 1), (2880, 2), (10080, 7), (43200, 30), (525600, 365), (2160, 2), (3600, 3), (1080, 1)],
)
def test_minute_intervals_collapse_to_whole_days(minutes, days):
    assert interval_days_from_minutes(minutes) == days


@pytest.mark.parametrize("minutes", [1, 60, 720, 1439])
def test_sub_day_intervals_round_up_to_one_day(minutes):
    """A zero-day interval would expire the moment the user armed the switch."""
    assert interval_days_from_minutes(minutes) == 1


@pytest.mark.parametrize("minutes", [525601, 1_000_000])
def test_minute_intervals_beyond_a_year_are_rejected(minutes):
    with pytest.raises(ValueError):
        interval_days_from_minutes(minutes)


def test_not_expired_before_deadline():
    deadline = compute_deadline(START, 1)
    assert not is_expired(deadline, deadline - timedelta(seconds=1))


def test_not_expired_exactly_at_deadline():
    deadline = compute_deadline(START, 1)
    assert not is_expired(deadline, deadline)


def test_expired_after_deadline():
    deadline = compute_deadline(START, 1)
    assert is_expired(deadline, deadline + timedelta(microseconds=1))


def test_no_deadline_never_expires():
    assert not is_expired(None, START)
    assert seconds_remaining(None, START) is None


def test_seconds_remaining_goes_negative_after_deadline():
    deadline = START + timedelta(hours=1)
    assert seconds_remaining(deadline, START) == 3600
    assert seconds_remaining(deadline, START + timedelta(hours=2)) == -3600
