"""Pure deadline rules shared by the API and the worker."""

from __future__ import annotations

from datetime import datetime, timedelta

MIN_INTERVAL_DAYS = 1
MAX_INTERVAL_DAYS = 365
MINUTES_PER_DAY = 1440
MAX_INTERVAL_MINUTES = MAX_INTERVAL_DAYS * MINUTES_PER_DAY


def validate_interval(days: int) -> int:
    if not MIN_INTERVAL_DAYS <= days <= MAX_INTERVAL_DAYS:
        raise ValueError("interval must be between 1 and 365 days")
    return days


def interval_days_from_minutes(minutes: int) -> int:
    """Collapse a minute-granular interval onto the day-granular one that is stored.

    Deadlines are day-granular end to end, so a minute value can only be honoured
    to the nearest whole day. Anything under a day rounds up to one day rather than
    to zero, because a zero-day interval would expire the instant the user armed
    the switch.
    """
    if minutes < MINUTES_PER_DAY:
        return MIN_INTERVAL_DAYS
    if minutes > MAX_INTERVAL_MINUTES:
        raise ValueError("interval must be at most 365 days")
    # Half-up, so 1.5 days is two days and not the even neighbour either way.
    return validate_interval((minutes + MINUTES_PER_DAY // 2) // MINUTES_PER_DAY)


def compute_deadline(last_check_in: datetime, interval_days: int) -> datetime:
    return last_check_in + timedelta(days=validate_interval(interval_days))


def is_expired(deadline: datetime | None, now: datetime) -> bool:
    """Expired strictly after the deadline: a check-in exactly at the deadline is on time."""
    return deadline is not None and deadline < now


def seconds_remaining(deadline: datetime | None, now: datetime) -> int | None:
    if deadline is None:
        return None
    return int((deadline - now).total_seconds())
