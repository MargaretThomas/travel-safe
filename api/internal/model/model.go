package model

import "time"

type User struct {
	ID                     string  `json:"id"`
	Name                   string  `json:"name"`
	Email                  *string `json:"email"`
	Phone                  *string `json:"phone"`
	APIKeyHash             string  `json:"-"`
	EmergencyToken         string  `json:"-"`
	CheckInIntervalMinutes *int    `json:"check_in_interval_minutes"`
	GraceMinutes           int     `json:"grace_minutes"`
	Timezone               *string `json:"timezone"`
	LastCheckInAt          string  `json:"last_check_in_at"`
	WarningSentFor         *string `json:"-"`
	TriggeredAt            *string `json:"triggered_at"`
	TriggerReason          *string `json:"trigger_reason"`
	CreatedAt              string  `json:"created_at"`
	UpdatedAt              string  `json:"updated_at"`
}

type Contact struct {
	ID          string  `json:"id"`
	UserID      string  `json:"-"`
	Name        string  `json:"name"`
	Email       *string `json:"email"`
	Phone       *string `json:"phone"`
	AccessToken *string `json:"-"`
	RevokedAt   *string `json:"revoked_at"`
	CreatedAt   string  `json:"created_at"`
	UpdatedAt   string  `json:"updated_at"`
}

type Location struct {
	ID         string   `json:"id"`
	UserID     string   `json:"-"`
	Latitude   float64  `json:"latitude"`
	Longitude  float64  `json:"longitude"`
	AccuracyM  *float64 `json:"accuracy_m"`
	RecordedAt string   `json:"recorded_at"`
	CreatedAt  string   `json:"created_at"`
}

type SOS struct {
	ID          string  `json:"id"`
	UserID      string  `json:"-"`
	Kind        string  `json:"kind"`
	Message     *string `json:"message"`
	ObjectKey   *string `json:"-"`
	ContentType *string `json:"content_type"`
	SizeBytes   *int64  `json:"size_bytes"`
	CreatedAt   string  `json:"created_at"`
}

type EmergencyEvent struct {
	ID              string  `json:"id"`
	UserID          string  `json:"-"`
	Reason          string  `json:"reason"`
	CreatedAt       string  `json:"created_at"`
	ResolvedAt      *string `json:"resolved_at"`
	FirstNotifiedAt *string `json:"first_notified_at"`
}

// Status derives the user-facing switch state. It is calculated rather than
// stored so a stale row cannot claim to be safe.
func Status(user *User, now time.Time) string {
	if user.TriggeredAt != nil && *user.TriggeredAt != "" {
		return "triggered"
	}
	if user.CheckInIntervalMinutes == nil || *user.CheckInIntervalMinutes <= 0 {
		return "ok"
	}
	last, err := time.Parse(time.RFC3339, user.LastCheckInAt)
	if err != nil {
		return "ok"
	}
	if !now.Before(last.Add(time.Duration(*user.CheckInIntervalMinutes) * time.Minute)) {
		return "warning"
	}
	return "ok"
}
