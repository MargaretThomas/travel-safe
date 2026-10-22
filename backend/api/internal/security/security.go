package security

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"strings"

	"github.com/google/uuid"
)

func NewID() string {
	return strings.ReplaceAll(uuid.New().String(), "-", "")
}

func NewSecret(prefix string, nbytes ...int) string {
	n := 32
	if len(nbytes) > 0 {
		n = nbytes[0]
	}
	b := make([]byte, n)
	rand.Read(b)
	return prefix + "_" + base64.RawURLEncoding.EncodeToString(b)
}

func NewLinkToken() string {
	b := make([]byte, 32)
	rand.Read(b)
	return base64.RawURLEncoding.EncodeToString(b)
}

func HashSecret(value string) string {
	h := sha256.Sum256([]byte(value))
	return hex.EncodeToString(h[:])
}

func SecretsMatch(candidate string, expectedHash string) bool {
	return hmac.Equal([]byte(HashSecret(candidate)), []byte(expectedHash))
}
