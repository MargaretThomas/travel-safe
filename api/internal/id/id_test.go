package id

import (
	"regexp"
	"strings"
	"testing"
)

var (
	uuidPattern  = regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`)
	tokenPattern = regexp.MustCompile(`^[A-Za-z0-9_-]{43}$`)
	hashPattern  = regexp.MustCompile(`^[0-9a-f]{64}$`)
)

func TestNewIsAUUIDv4(t *testing.T) {
	seen := make(map[string]struct{}, 1000)
	for range 1000 {
		value := New()
		if !uuidPattern.MatchString(value) {
			t.Fatalf("%q is not a UUID v4", value)
		}
		if _, duplicate := seen[value]; duplicate {
			t.Fatalf("duplicate identifier generated: %s", value)
		}
		seen[value] = struct{}{}
	}
}

func TestTokenIsURLSafe256Bit(t *testing.T) {
	if value := Token(); !tokenPattern.MatchString(value) {
		t.Fatalf("%q is not a 43-character URL-safe 256-bit token", value)
	}
	seen := make(map[string]struct{}, 500)
	for range 500 {
		value := Token()
		if _, duplicate := seen[value]; duplicate {
			t.Fatalf("duplicate token generated: %s", value)
		}
		seen[value] = struct{}{}
	}
}

func TestAPIKeyHasPrefixAndHash(t *testing.T) {
	key := APIKey()
	if !strings.HasPrefix(key, "ts_live_") {
		t.Fatalf("API key is missing its prefix: %q", key)
	}
	if !tokenPattern.MatchString(strings.TrimPrefix(key, "ts_live_")) {
		t.Fatalf("API key body is not a token: %q", key)
	}

	hash := Hash(key)
	if !hashPattern.MatchString(hash) {
		t.Fatalf("%q is not a SHA-256 hex digest", hash)
	}
	if Hash(key) != hash {
		t.Fatal("hashing must be deterministic")
	}
	if Hash("ts_live_other") == hash {
		t.Fatal("different keys must produce different hashes")
	}
	if strings.Contains(hash, key) {
		t.Fatal("the hash must not contain the plaintext key")
	}
}
