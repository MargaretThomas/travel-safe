"""Pure deadline rules shared by the API and the worker.

The interval is stored and computed in whole minutes: a sub-day rhythm such as
"check in every hour" cannot be expressed in days without losing the user's choice.
"""

from __future__ import annotations

from datetime import datetime, timedelta

HOUR_MINUTES = 60
DAY_MINUTES = 24 * HOUR_MINUTES
MIN_INTERVAL_MINUTES = HOUR_MINUTES
MAX_INTERVAL_DAYS = 365
MAX_INTERVAL_MINUTES = MAX_INTERVAL_DAYS * DAY_MINUTES


def validate_interval_minutes(minutes: int) -> int:
    if not MIN_INTERVAL_MINUTES <= minutes <= MAX_INTERVAL_MINUTES:
        raise ValueError("interval must be between 1 hour and 365 days")
    return minutes


def days_to_minutes(days: int) -> int:
    if not 1 <= days <= MAX_INTERVAL_DAYS:
        raise ValueError("interval must be between 1 and 365 days")
    return days * DAY_MINUTES


def compute_deadline(last_check_in: datetime, interval_minutes: int) -> datetime:
    return last_check_in + timedelta(minutes=validate_interval_minutes(interval_minutes))


def is_expired(deadline: datetime | None, now: datetime) -> bool:
    """Expired strictly after the deadline: a check-in exactly at the deadline is on time."""
    return deadline is not None and deadline < now


def seconds_remaining(deadline: datetime | None, now: datetime) -> int | None:
    if deadline is None:
        return None
    return int((deadline - now).total_seconds())
