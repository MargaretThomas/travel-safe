package id

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
)

// New returns a 128-bit random identifier. It is deliberately not a UUID
// implementation dependency: the shape is stable and collision-safe.
func New() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		panic(fmt.Sprintf("id: %v", err))
	}
	// RFC 4122 version 4 / variant bits.
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

// Token returns a URL-safe 256-bit secret.
func Token() string {
	var b [32]byte
	if _, err := rand.Read(b[:]); err != nil {
		panic(fmt.Sprintf("token: %v", err))
	}
	return base64.RawURLEncoding.EncodeToString(b[:])
}

// APIKey returns a displayable, prefix-tagged API key. Only the hash is stored.
func APIKey() string {
	return "ts_live_" + Token()
}

// Hash is used for API keys, which are never stored in plaintext.
func Hash(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}
