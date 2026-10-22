package switcher

import (
	"errors"
	"time"
)

const (
	HOUR_MINUTES      = 60
	DAY_MINUTES       = 24 * HOUR_MINUTES
	MIN_INTERVAL_MINUTES = HOUR_MINUTES
	MAX_INTERVAL_DAYS = 365
	MAX_INTERVAL_MINUTES = MAX_INTERVAL_DAYS * DAY_MINUTES
)

func ValidateIntervalMinutes(minutes int) (int, error) {
	if minutes < MIN_INTERVAL_MINUTES || minutes > MAX_INTERVAL_MINUTES {
		return 0, errors.New("interval must be between 1 hour and 365 days")
	}
	return minutes, nil
}

func DaysToMinutes(days int) (int, error) {
	if days < 1 || days > MAX_INTERVAL_DAYS {
		return 0, errors.New("interval must be between 1 and 365 days")
	}
	return days * DAY_MINUTES, nil
}

func ComputeDeadline(lastCheckIn time.Time, intervalMinutes int) (time.Time, error) {
	validated, err := ValidateIntervalMinutes(intervalMinutes)
	if err != nil {
		return time.Time{}, err
	}
	return lastCheckIn.Add(time.Duration(validated) * time.Minute), nil
}

func IsExpired(deadline *time.Time, now time.Time) bool {
	if deadline == nil {
		return false
	}
	return deadline.Before(now)
}

func SecondsRemaining(deadline *time.Time, now time.Time) *int {
	if deadline == nil {
		return nil
	}
	seconds := int(deadline.Sub(now).Seconds())
	return &seconds
}
