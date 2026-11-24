package validate

import (
	"errors"
	"net/mail"
	"regexp"
	"strings"
	"unicode/utf8"
)

// FieldError is a validation failure that can name the request field the
// client should highlight. API responses use the same shape for every error.
type FieldError struct {
	Field   string
	Message string
}

func (e *FieldError) Error() string { return e.Message }

func fail(field, message string) error { return &FieldError{Field: field, Message: message} }

var (
	phonePattern = regexp.MustCompile(`^\+?[0-9(][0-9 ()-]{4,30}$`)
	zonePattern  = regexp.MustCompile(`^[A-Za-z_]+/[A-Za-z0-9_+\-/]+$`)
)

const (
	MinIntervalMinutes = 15
	MaxIntervalMinutes = 43200 // 30 days
	MaxGraceMinutes    = 1440  // 24 hours
	MaxNameLength      = 100
)

// Name trims a required display name.
func Name(value string) (string, error) {
	name := strings.TrimSpace(value)
	if name == "" {
		return "", fail("name", "A name is required.")
	}
	if utf8.RuneCountInString(name) > MaxNameLength {
		return "", fail("name", "A name must be 100 characters or fewer.")
	}
	return name, nil
}

// OptionalName validates a name when it was supplied and accepts an empty
// value for optional update fields.
func OptionalName(value string) (string, error) {
	if strings.TrimSpace(value) == "" {
		return "", nil
	}
	return Name(value)
}

// Email normalises and validates an optional email address.
func Email(value string) (string, error) {
	email := strings.TrimSpace(value)
	if email == "" {
		return "", nil
	}
	if len(email) > 254 {
		return "", fail("email", "An email address must be 254 characters or fewer.")
	}
	addr, err := mail.ParseAddress(email)
	if err != nil || addr.Address != email || !strings.Contains(email, "@") {
		return "", fail("email", "Enter a valid email address.")
	}
	return strings.ToLower(email), nil
}

// Phone normalises an optional phone number without pretending to validate
// every national numbering plan. E.164-looking values and local formatting are
// both accepted; the notification provider is the final authority.
func Phone(value string) (string, error) {
	phone := strings.TrimSpace(value)
	if phone == "" {
		return "", nil
	}
	if !phonePattern.MatchString(phone) {
		return "", fail("phone", "Enter a valid phone number, including the country code where possible.")
	}
	digits := 0
	for _, r := range phone {
		if r >= '0' && r <= '9' {
			digits++
		}
	}
	if digits < 5 {
		return "", fail("phone", "Enter a valid phone number.")
	}
	return phone, nil
}

// Contact requires a name and at least one reachable channel. A name on its
// own is not enough to notify anybody.
func Contact(name, email, phone string) (string, string, string, error) {
	cleanName, err := Name(name)
	if err != nil {
		return "", "", "", err
	}
	cleanEmail, err := Email(email)
	if err != nil {
		return "", "", "", err
	}
	cleanPhone, err := Phone(phone)
	if err != nil {
		return "", "", "", err
	}
	if cleanEmail == "" && cleanPhone == "" {
		return "", "", "", fail("email", "Add an email address or a phone number so we can reach this contact.")
	}
	return cleanName, cleanEmail, cleanPhone, nil
}

// Interval validates the optional dead-man switch interval. nil disables the
// switch; a supplied value is clamped to a sensible range.
func Interval(minutes *int) (*int, error) {
	if minutes == nil {
		return nil, nil
	}
	value := *minutes
	if value == 0 {
		return nil, nil
	}
	if value < MinIntervalMinutes || value > MaxIntervalMinutes {
		return nil, fail("check_in_interval_minutes", "Choose an interval between 15 minutes and 30 days.")
	}
	return &value, nil
}

func Grace(minutes *int) (int, error) {
	if minutes == nil {
		return 60, nil
	}
	if *minutes < 0 || *minutes > MaxGraceMinutes {
		return 0, fail("grace_minutes", "Grace must be between 0 and 1440 minutes.")
	}
	return *minutes, nil
}

// Timezone validates an optional IANA timezone name. It is informational: all
// stored timestamps remain UTC.
func Timezone(value string) (string, error) {
	tz := strings.TrimSpace(value)
	if tz == "" {
		return "", nil
	}
	if len(tz) > 64 || !zonePattern.MatchString(tz) {
		return "", fail("timezone", "Use an IANA timezone such as Africa/Johannesburg.")
	}
	return tz, nil
}

func Latitude(value float64) error {
	if value < -90 || value > 90 {
		return fail("latitude", "Latitude must be between -90 and 90.")
	}
	return nil
}

func Longitude(value float64) error {
	if value < -180 || value > 180 {
		return fail("longitude", "Longitude must be between -180 and 180.")
	}
	return nil
}

func Accuracy(value *float64) error {
	if value != nil && (*value < 0 || *value > 100000) {
		return fail("accuracy_m", "Accuracy must be between 0 and 100000 metres.")
	}
	return nil
}

func Message(value string) (string, error) {
	message := strings.TrimSpace(value)
	if utf8.RuneCountInString(message) > 4000 {
		return "", fail("message", "A message must be 4000 characters or fewer.")
	}
	return message, nil
}

// AsFieldError exposes a FieldError for the API error envelope.
func AsFieldError(err error) (*FieldError, bool) {
	var fieldErr *FieldError
	if errors.As(err, &fieldErr) {
		return fieldErr, true
	}
	return nil, false
}
