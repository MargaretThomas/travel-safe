package media

import (
	"mime"
	"strings"
)

const (
	MaxUploadBytes = 25 << 20 // 25 MiB
)

// Kind classifies an uploaded SOS body by MIME type. Only media types the
// emergency page can render are accepted, which keeps arbitrary uploads out of
// the bucket.
func Kind(contentType string) (string, bool) {
	base, _, err := mime.ParseMediaType(contentType)
	if err != nil {
		base = strings.ToLower(strings.TrimSpace(strings.Split(contentType, ";")[0]))
	}
	switch {
	case strings.HasPrefix(base, "video/"):
		return "video", true
	case strings.HasPrefix(base, "image/"):
		// SVG can carry active content, so it is not accepted as an image upload.
		if base == "image/svg+xml" {
			return "", false
		}
		return "image", true
	case strings.HasPrefix(base, "audio/"):
		return "audio", true
	case base == "application/json" || base == "text/plain":
		return "message", true
	default:
		return "", false
	}
}

func Extension(contentType, kind string) string {
	base, _, err := mime.ParseMediaType(contentType)
	if err != nil {
		base = strings.ToLower(strings.TrimSpace(strings.Split(contentType, ";")[0]))
	}
	switch base {
	case "video/mp4":
		return ".mp4"
	case "video/webm":
		return ".webm"
	case "video/quicktime":
		return ".mov"
	case "image/jpeg", "image/jpg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/webp":
		return ".webp"
	case "image/gif":
		return ".gif"
	case "audio/mpeg", "audio/mp3":
		return ".mp3"
	case "audio/wav", "audio/x-wav":
		return ".wav"
	case "audio/ogg":
		return ".ogg"
	case "audio/mp4", "audio/x-m4a", "audio/aac":
		return ".m4a"
	}
	if kind == "video" {
		return ".bin"
	}
	if kind == "image" {
		return ".bin"
	}
	return ".bin"
}

// SafeContentType is served back on the public media route. Content-Disposition
// is forced inline so a browser renders an image or player instead of
// downloading it.
func SafeContentType(kind, stored string) string {
	if stored != "" {
		return stored
	}
	switch kind {
	case "video":
		return "video/mp4"
	case "image":
		return "image/jpeg"
	case "audio":
		return "audio/mpeg"
	default:
		return "application/octet-stream"
	}
}
