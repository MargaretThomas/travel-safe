package timeutil

import "time"

// RFC3339 is the single timestamp format stored in D1. Every timestamp is UTC
// and truncated to a whole second so string comparisons in SQLite are also
// chronological comparisons.
func Format(t time.Time) string {
	return t.UTC().Truncate(time.Second).Format(time.RFC3339)
}

func Now() string {
	return Format(time.Now())
}

func Parse(value string) (time.Time, error) {
	return time.Parse(time.RFC3339, value)
}

// AddMinutes returns base shifted by minutes, in storage format.
func AddMinutes(base string, minutes int) string {
	t, err := Parse(base)
	if err != nil {
		return base
	}
	return Format(t.Add(time.Duration(minutes) * time.Minute))
}

// Since returns the storage timestamp for now-days, used by 7-day retention.
func Since(days int) string {
	return Format(time.Now().AddDate(0, 0, -days))
}
