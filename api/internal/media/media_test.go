package media

import "testing"

func TestKind(t *testing.T) {
	tests := []struct {
		contentType string
		want        string
		ok          bool
	}{
		{"video/mp4", "video", true},
		{"video/webm; codecs=vp9", "video", true},
		{"image/jpeg", "image", true},
		{"image/png; charset=binary", "image", true},
		{"audio/mpeg", "audio", true},
		{"audio/mp4", "audio", true},
		{"application/json", "message", true},
		{"application/json; charset=utf-8", "message", true},
		{"text/plain", "message", true},
		{"application/octet-stream", "", false},
		{"text/html", "", false},
		{"image/svg+xml", "", false},
		{"", "", false},
	}

	for _, test := range tests {
		t.Run(test.contentType, func(t *testing.T) {
			got, ok := Kind(test.contentType)
			if got != test.want || ok != test.ok {
				t.Fatalf("Kind(%q) = %q, %v; want %q, %v", test.contentType, got, ok, test.want, test.ok)
			}
		})
	}
}

func TestExtension(t *testing.T) {
	tests := map[string]string{
		"video/mp4":        ".mp4",
		"video/webm":       ".webm",
		"video/quicktime":  ".mov",
		"image/jpeg":       ".jpg",
		"image/webp":       ".webp",
		"image/gif":        ".gif",
		"audio/mpeg":       ".mp3",
		"audio/wav":        ".wav",
		"audio/ogg":        ".ogg",
		"audio/mp4":        ".m4a",
		"video/x-matroska": ".bin",
		"application/pdf":  ".bin",
	}
	for contentType, want := range tests {
		if got := Extension(contentType, "video"); got != want {
			t.Fatalf("Extension(%q) = %q, want %q", contentType, got, want)
		}
	}
}

func TestExtensionStripsParameters(t *testing.T) {
	if got := Extension("image/png; charset=binary", "image"); got != ".png" {
		t.Fatalf("expected .png, got %q", got)
	}
}

func TestSafeContentType(t *testing.T) {
	if got := SafeContentType("video", "video/mp4"); got != "video/mp4" {
		t.Fatalf("stored content type should win, got %q", got)
	}
	if got := SafeContentType("video", ""); got != "video/mp4" {
		t.Fatalf("video fallback wrong: %q", got)
	}
	if got := SafeContentType("image", ""); got != "image/jpeg" {
		t.Fatalf("image fallback wrong: %q", got)
	}
	if got := SafeContentType("audio", ""); got != "audio/mpeg" {
		t.Fatalf("audio fallback wrong: %q", got)
	}
	if got := SafeContentType("message", ""); got != "application/octet-stream" {
		t.Fatalf("message fallback wrong: %q", got)
	}
}

func TestUploadLimitIsTwentyFiveMebibytes(t *testing.T) {
	if MaxUploadBytes != 25*1024*1024 {
		t.Fatalf("upload limit changed unexpectedly: %d", MaxUploadBytes)
	}
}
