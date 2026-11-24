package validate

import (
	"errors"
	"strings"
	"testing"
)

func fieldOf(t *testing.T, err error) string {
	t.Helper()
	fieldErr, ok := AsFieldError(err)
	if !ok {
		t.Fatalf("expected a FieldError, got %v", err)
	}
	if fieldErr.Field == "" || fieldErr.Message == "" {
		t.Fatalf("FieldError must carry a field and message, got %+v", fieldErr)
	}
	return fieldErr.Field
}

func intPtr(value int) *int { return &value }

func TestName(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    string
		wantErr bool
	}{
		{"trims", "  Thandi Mokoena  ", "Thandi Mokoena", false},
		{"empty", "   ", "", true},
		{"one hundred characters", strings.Repeat("a", 100), strings.Repeat("a", 100), false},
		{"too long", strings.Repeat("a", 101), "", true},
		{"counts runes not bytes", strings.Repeat("é", 100), strings.Repeat("é", 100), false},
		{"too many runes", strings.Repeat("é", 101), "", true},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got, err := Name(test.input)
			if test.wantErr {
				if err == nil {
					t.Fatalf("expected an error for %q", test.input)
				}
				if field := fieldOf(t, err); field != "name" {
					t.Fatalf("wrong field: %s", field)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != test.want {
				t.Fatalf("got %q, want %q", got, test.want)
			}
		})
	}
}

func TestOptionalName(t *testing.T) {
	if got, err := OptionalName("   "); err != nil || got != "" {
		t.Fatalf("blank optional name should be empty, got %q / %v", got, err)
	}
	if got, err := OptionalName(" Thandi "); err != nil || got != "Thandi" {
		t.Fatalf("optional name should be trimmed, got %q / %v", got, err)
	}
	if _, err := OptionalName(strings.Repeat("a", 101)); err == nil {
		t.Fatal("expected an error for an overlong optional name")
	}
}

func TestEmail(t *testing.T) {
	tests := []struct {
		input   string
		want    string
		wantErr bool
	}{
		{"", "", false},
		{"  ", "", false},
		{"Thandi@Example.COM", "thandi@example.com", false},
		{"thandi+travel@example.co.za", "thandi+travel@example.co.za", false},
		{"not-an-email", "", true},
		{"a@", "", true},
		{"Name <thandi@example.com>", "", true},
		{"a b@example.com", "", true},
		{strings.Repeat("a", 250) + "@example.com", "", true},
	}

	for _, test := range tests {
		t.Run(test.input, func(t *testing.T) {
			got, err := Email(test.input)
			if test.wantErr {
				if err == nil {
					t.Fatalf("expected an error for %q", test.input)
				}
				if field := fieldOf(t, err); field != "email" {
					t.Fatalf("wrong field: %s", field)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != test.want {
				t.Fatalf("got %q, want %q", got, test.want)
			}
		})
	}
}

func TestPhone(t *testing.T) {
	for _, valid := range []string{"+27821234567", "(021) 555-1234", "082 123 4567", "+27 82 123 4567"} {
		if _, err := Phone(valid); err != nil {
			t.Fatalf("%q should be accepted: %v", valid, err)
		}
	}
	for _, invalid := range []string{"abc", "1234", "++27821234567", "phone: 0821234567", "0821234567890123456789012345678901"} {
		if _, err := Phone(invalid); err == nil {
			t.Fatalf("%q should be rejected", invalid)
		}
	}
	if got, err := Phone("  "); err != nil || got != "" {
		t.Fatalf("blank optional phone should be empty, got %q / %v", got, err)
	}
}

func TestContactRequiresReachableChannel(t *testing.T) {
	if _, _, _, err := Contact("Sipho", "", ""); err == nil {
		t.Fatal("a name-only contact must be rejected")
	} else if field := fieldOf(t, err); field != "email" {
		t.Fatalf("expected the error to point at email, got %s", field)
	}

	name, email, phone, err := Contact(" Sipho Dlamini ", "Sipho@Example.com", "")
	if err != nil {
		t.Fatalf("email-only contact should be valid: %v", err)
	}
	if name != "Sipho Dlamini" || email != "sipho@example.com" || phone != "" {
		t.Fatalf("unexpected normalisation: %q %q %q", name, email, phone)
	}

	if _, _, _, err := Contact("Sipho", "", "+27829876543"); err != nil {
		t.Fatalf("phone-only contact should be valid: %v", err)
	}

	if _, _, _, err := Contact("Sipho", "bad", "+27829876543"); err == nil {
		t.Fatal("an invalid email should still fail even when a phone is present")
	}
}

func TestInterval(t *testing.T) {
	if got, err := Interval(nil); err != nil || got != nil {
		t.Fatalf("nil should disable the switch: %v / %v", got, err)
	}
	if got, err := Interval(intPtr(0)); err != nil || got != nil {
		t.Fatalf("zero should disable the switch: %v / %v", got, err)
	}
	if got, err := Interval(intPtr(15)); err != nil || got == nil || *got != 15 {
		t.Fatalf("15 should be accepted: %v / %v", got, err)
	}
	if got, err := Interval(intPtr(43200)); err != nil || got == nil || *got != 43200 {
		t.Fatalf("30 days should be accepted: %v / %v", got, err)
	}
	for _, value := range []int{1, 14, 43201, -1} {
		if _, err := Interval(intPtr(value)); err == nil {
			t.Fatalf("%d should be rejected", value)
		}
	}
}

func TestGrace(t *testing.T) {
	if got, err := Grace(nil); err != nil || got != 60 {
		t.Fatalf("default grace should be 60, got %d / %v", got, err)
	}
	for _, value := range []int{0, 30, 1440} {
		if got, err := Grace(intPtr(value)); err != nil || got != value {
			t.Fatalf("grace %d should be accepted, got %d / %v", value, got, err)
		}
	}
	for _, value := range []int{-1, 1441} {
		if _, err := Grace(intPtr(value)); err == nil {
			t.Fatalf("grace %d should be rejected", value)
		}
	}
}

func TestTimezone(t *testing.T) {
	if got, err := Timezone("  Africa/Johannesburg "); err != nil || got != "Africa/Johannesburg" {
		t.Fatalf("valid timezone rejected: %q / %v", got, err)
	}
	if got, err := Timezone("America/Argentina/Buenos_Aires"); err != nil || got == "" {
		t.Fatalf("valid nested timezone rejected: %q / %v", got, err)
	}
	for _, value := range []string{"Africa", "Europe/", "Africa/Johannesburg!", "/etc/passwd"} {
		if _, err := Timezone(value); err == nil {
			t.Fatalf("%q should be rejected", value)
		}
	}
}

func TestCoordinatesAndMessage(t *testing.T) {
	for _, value := range []float64{-90, 0, 90} {
		if err := Latitude(value); err != nil {
			t.Fatalf("latitude %v should be valid: %v", value, err)
		}
	}
	for _, value := range []float64{-90.1, 90.1} {
		if err := Latitude(value); err == nil {
			t.Fatalf("latitude %v should be invalid", value)
		}
	}
	for _, value := range []float64{-180, 0, 180} {
		if err := Longitude(value); err != nil {
			t.Fatalf("longitude %v should be valid: %v", value, err)
		}
	}
	for _, value := range []float64{-180.1, 180.1} {
		if err := Longitude(value); err == nil {
			t.Fatalf("longitude %v should be invalid", value)
		}
	}

	accuracy := 12.5
	if err := Accuracy(&accuracy); err != nil {
		t.Fatalf("accuracy should be valid: %v", err)
	}
	negative := -1.0
	if err := Accuracy(&negative); err == nil {
		t.Fatal("negative accuracy should be invalid")
	}
	if err := Accuracy(nil); err != nil {
		t.Fatalf("nil accuracy should be valid: %v", err)
	}

	message, err := Message("  On my way back  ")
	if err != nil || message != "On my way back" {
		t.Fatalf("message should be trimmed: %q / %v", message, err)
	}
	if _, err := Message(strings.Repeat("a", 4001)); err == nil {
		t.Fatal("an overlong message should be rejected")
	}
}

func TestAsFieldErrorRejectsPlainErrors(t *testing.T) {
	if _, ok := AsFieldError(nil); ok {
		t.Fatal("nil is not a field error")
	}
	if _, ok := AsFieldError(errors.New("plain")); ok {
		t.Fatal("a plain error is not a field error")
	}
}
