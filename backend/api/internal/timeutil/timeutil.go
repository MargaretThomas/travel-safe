package timeutil

import "time"

const DBFormat = "2006-01-02T15:04:05.000000Z"

func UTCNow() time.Time {
	return time.Now().UTC()
}

func EnsureUTC(t time.Time) time.Time {
	return t.UTC()
}

func ToDB(t time.Time) string {
	return t.UTC().Format(DBFormat)
}

func FromDB(s *string) *time.Time {
	if s == nil || *s == "" {
		return nil
	}
	t, err := time.Parse(DBFormat, *s)
	if err != nil {
		t2, err2 := time.Parse(time.RFC3339Nano, *s)
		if err2 != nil {
			t3, err3 := time.Parse("2006-01-02T15:04:05Z", *s)
			if err3 != nil {
				return nil
			}
			t = t3
		} else {
			t = t2
		}
	}
	t = t.UTC()
	return &t
}

func FromDBString(s string) *time.Time {
	if s == "" {
		return nil
	}
	t, err := time.Parse(DBFormat, s)
	if err != nil {
		t2, err2 := time.Parse(time.RFC3339Nano, s)
		if err2 != nil {
			t3, err3 := time.Parse("2006-01-02T15:04:05Z", s)
			if err3 != nil {
				return nil
			}
			t = t3
		} else {
			t = t2
		}
	}
	t = t.UTC()
	return &t
}

func UTC() time.Time {
	return time.Now().UTC()
}
