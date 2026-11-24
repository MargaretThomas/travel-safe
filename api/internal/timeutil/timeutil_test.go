package timeutil

import (
	"testing"
	"time"
)

func TestFormatIsUTCAndWholeSeconds(t *testing.T) {
	value := time.Date(2026, 11, 23, 11, 0, 0, 987654321, time.FixedZone("SAST", 2*60*60))
	got := Format(value)
	if got != "2026-11-23T09:00:00Z" {
		t.Fatalf("Format() = %q", got)
	}
}

func TestParseRoundTrips(t *testing.T) {
	const value = "2026-11-23T09:00:00Z"
	parsed, err := Parse(value)
	if err != nil {
		t.Fatalf("Parse failed: %v", err)
	}
	if Format(parsed) != value {
		t.Fatalf("round trip changed the value: %q", Format(parsed))
	}
	if _, err := Parse("2026-11-23 09:00:00"); err == nil {
		t.Fatal("a non-RFC3339 timestamp should be rejected")
	}
}

func TestAddMinutes(t *testing.T) {
	got := AddMinutes("2026-11-23T09:00:00Z", 90)
	if got != "2026-11-23T10:30:00Z" {
		t.Fatalf("AddMinutes() = %q", got)
	}
	got = AddMinutes("2026-11-23T09:00:00Z", -1440)
	if got != "2026-11-22T09:00:00Z" {
		t.Fatalf("AddMinutes() = %q", got)
	}
	if got := AddMinutes("not-a-timestamp", 5); got != "not-a-timestamp" {
		t.Fatalf("invalid input should be returned unchanged, got %q", got)
	}
}

func TestSince(t *testing.T) {
	parsed, err := Parse(Since(7))
	if err != nil {
		t.Fatalf("Since produced an invalid timestamp: %v", err)
	}
	delta := time.Since(parsed)
	if delta < 6*24*time.Hour || delta > 8*24*time.Hour {
		t.Fatalf("Since(7) is %v away from now", delta)
	}
}
