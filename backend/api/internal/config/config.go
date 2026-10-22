package config

import (
	"bufio"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

type Settings struct {
	DBPath string

	PublicBaseURL string
	CORSOrigins   []string

	AccessTokenTTL  time.Duration
	RefreshTokenTTL time.Duration

	LocationRetention   time.Duration
	EmergencyLinkTTL    time.Duration
	ArchiveRetention    time.Duration

	NotificationMaxAttempts int
	MaxContactsPerUser      int
	MaxLocationBatch        int
	WorkerIntervalSeconds   int

	ResendAPIKey    *string
	ResendFromEmail *string

	WhatsAppBotURL   string
	WhatsAppBotToken *string

	MapboxPublicToken *string
	MapboxServerToken *string
}

func EnvFilePath() string {
	// backend/code/.env relative to this package
	// go up from internal/config
	return filepath.Join("..", "..", "code", ".env")
	// or find from cwd
}

func LoadEnvFile() int {
	// try common locations
	paths := []string{
		"../code/.env",
		"../../code/.env",
		"../../../backend/code/.env",
		filepath.Join(filepath.Dir(os.Args[0]), "..", "code", ".env"),
	}
	loaded := 0
	for _, p := range paths {
		if _, err := os.Stat(p); err == nil {
			file, _ := os.Open(p)
			defer file.Close()
			scanner := bufio.NewScanner(file)
			for scanner.Scan() {
				line := scanner.Text()
				if strings.TrimSpace(line) == "" || strings.HasPrefix(strings.TrimSpace(line), "#") {
					continue
				}
				if strings.HasPrefix(strings.TrimSpace(line), "export ") {
					line = strings.TrimSpace(line)[7:]
				} else {
					line = strings.TrimSpace(line)
				}
				parts := strings.SplitN(line, "=", 2)
				if len(parts) != 2 {
					continue
				}
				key := strings.TrimSpace(parts[0])
				value := strings.TrimSpace(parts[1])
				if len(value) >= 2 && value[0] == value[len(value)-1] && (value[0] == '"' || value[0] == '\'') {
					value = value[1 : len(value)-1]
				}
				if os.Getenv(key) == "" {
					os.Setenv(key, value)
					loaded++
				}
			}
			break
		}
	}
	return loaded
}

func optional(env map[string]string, key string) *string {
	if v, ok := env[key]; ok {
		v = strings.TrimSpace(v)
		if v != "" {
			return &v
		}
	}
	return nil
}

func getInt(env map[string]string, key string, def int) int {
	if v, ok := env[key]; ok {
		v = strings.TrimSpace(v)
		if v != "" {
			if i, err := strconv.Atoi(v); err == nil {
				return i
			}
		}
	}
	return def
}

func FromEnv(env map[string]string) *Settings {
	if env == nil {
		LoadEnvFile()
		env = map[string]string{}
		for _, e := range os.Environ() {
			parts := strings.SplitN(e, "=", 2)
			if len(parts) == 2 {
				env[parts[0]] = parts[1]
			}
		}
	}

	origins := []string{}
	if v, ok := env["DEADMAN_CORS_ORIGINS"]; ok {
		for _, o := range strings.Split(v, ",") {
			o = strings.TrimSpace(o)
			if o != "" {
				origins = append(origins, o)
			}
		}
	}

	resendKey := optional(env, "RESEND_API_KEY")
	resendFrom := optional(env, "RESEND_FROM_EMAIL")
	waToken := optional(env, "WHATSAPP_BOT_TOKEN")
	mapboxPub := optional(env, "MAPBOX_PUBLIC_TOKEN")
	mapboxSrv := optional(env, "MAPBOX_SERVER_TOKEN")

	return &Settings{
		DBPath:                  envOr(env, "DEADMAN_DB_PATH", "deadman.db"),
		PublicBaseURL:           envOr(env, "DEADMAN_PUBLIC_BASE_URL", "http://127.0.0.1:8000"),
		CORSOrigins:             origins,
		AccessTokenTTL:          time.Hour,
		RefreshTokenTTL:         180 * 24 * time.Hour,
		LocationRetention:       time.Duration(getInt(env, "DEADMAN_LOCATION_RETENTION_HOURS", 24)) * time.Hour,
		EmergencyLinkTTL:        time.Duration(getInt(env, "DEADMAN_EMERGENCY_LINK_TTL_DAYS", 30)) * 24 * time.Hour,
		ArchiveRetention:        time.Duration(getInt(env, "DEADMAN_ARCHIVE_RETENTION_DAYS", 90)) * 24 * time.Hour,
		NotificationMaxAttempts: getInt(env, "DEADMAN_NOTIFICATION_MAX_ATTEMPTS", 3),
		MaxContactsPerUser:      10,
		MaxLocationBatch:        100,
		WorkerIntervalSeconds:   getInt(env, "DEADMAN_WORKER_INTERVAL_SECONDS", 60),
		ResendAPIKey:            resendKey,
		ResendFromEmail:         resendFrom,
		WhatsAppBotURL:          envOr(env, "WHATSAPP_BOT_URL", ""),
		WhatsAppBotToken:        waToken,
		MapboxPublicToken:       mapboxPub,
		MapboxServerToken:       mapboxSrv,
	}
}

func envOr(env map[string]string, key, def string) string {
	if v, ok := env[key]; ok && strings.TrimSpace(v) != "" {
		return strings.TrimSpace(v)
	}
	return def
}

func (s *Settings) EmergencyURL(token string) string {
	base := strings.TrimRight(s.PublicBaseURL, "/")
	return base + "/e/" + token
}
