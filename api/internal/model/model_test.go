package model

import (
	"encoding/json"
	"strings"
	"testing"
	"time"
)

func interval(value int) *int  { return &value }
func str(value string) *string { return &value }

func TestStatus(t *testing.T) {
	now := time.Date(2026, 11, 23, 12, 0, 0, 0, time.UTC)

	tests := []struct {
		name string
		user User
		want string
	}{
		{
			name: "triggered wins over everything",
			user: User{
				TriggeredAt:            str("2026-11-23T11:00:00Z"),
				CheckInIntervalMinutes: interval(60),
				LastCheckInAt:          "2026-11-23T11:00:00Z",
			},
			want: "triggered",
		},
		{
			name: "disabled switch is okay",
			user: User{CheckInIntervalMinutes: nil, LastCheckInAt: "2026-01-01T00:00:00Z"},
			want: "ok",
		},
		{
			name: "zero interval is okay",
			user: User{CheckInIntervalMinutes: interval(0), LastCheckInAt: "2026-01-01T00:00:00Z"},
			want: "ok",
		},
		{
			name: "inside the window",
			user: User{CheckInIntervalMinutes: interval(60), LastCheckInAt: "2026-11-23T11:30:00Z"},
			want: "ok",
		},
		{
			name: "exactly at the deadline is overdue",
			user: User{CheckInIntervalMinutes: interval(60), LastCheckInAt: "2026-11-23T11:00:00Z"},
			want: "warning",
		},
		{
			name: "past the deadline",
			user: User{CheckInIntervalMinutes: interval(60), LastCheckInAt: "2026-11-23T09:00:00Z"},
			want: "warning",
		},
		{
			name: "unparseable timestamp fails safe",
			user: User{CheckInIntervalMinutes: interval(60), LastCheckInAt: "yesterday"},
			want: "ok",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := Status(&test.user, now); got != test.want {
				t.Fatalf("Status() = %q, want %q", got, test.want)
			}
		})
	}
}

func TestUserJSONHidesSecrets(t *testing.T) {
	user := User{
		ID:             "usr_1",
		Name:           "Thandi",
		APIKeyHash:     "deadbeef",
		EmergencyToken: "owner_token",
		WarningSentFor: str("2026-11-23T10:00:00Z"),
		LastCheckInAt:  "2026-11-23T11:00:00Z",
	}
	encoded, err := json.Marshal(user)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}
	body := string(encoded)
	for _, secret := range []string{"deadbeef", "owner_token", "warning_sent_for"} {
		if strings.Contains(body, secret) {
			t.Fatalf("JSON leaked %q: %s", secret, body)
		}
	}
	for _, visible := range []string{"usr_1", "last_check_in_at"} {
		if !strings.Contains(body, visible) {
			t.Fatalf("JSON is missing %q: %s", visible, body)
		}
	}
}

func TestSOSJSONHidesObjectKey(t *testing.T) {
	sos := SOS{
		ID:        "sos_1",
		Kind:      "video",
		ObjectKey: str("private/users/usr_1/sos.mp4"),
	}
	encoded, err := json.Marshal(sos)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}
	if strings.Contains(string(encoded), "private/users") {
		t.Fatalf("the R2 object key leaked: %s", encoded)
	}
}
