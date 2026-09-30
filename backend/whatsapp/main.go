package main

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"mime"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"regexp"
	"strings"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	_ "github.com/mattn/go-sqlite3"
	"github.com/skip2/go-qrcode"
	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/proto/waE2E"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
	waLog "go.mau.fi/whatsmeow/util/log"
	"google.golang.org/protobuf/proto"
)

const (
	dbPath      = "store.db"
	qrImagePath = "qr.png"
	maxUpload   = 50 << 20
)

var phonePattern = regexp.MustCompile(`^\d{7,15}$`)

type config struct {
	host     string
	port     string
	token    string
	pushName string
}

func loadConfig() config {
	cfg := config{
		// Loopback by default: /send impersonates the paired account, so it must not
		// be reachable from the LAN unless someone deliberately opts in.
		host:  envOr("HOST", "127.0.0.1"),
		port:  envOr("PORT", "8080"),
		token: os.Getenv("WHATSAPP_BOT_TOKEN"),
		// WhatsApp shows this name on the linked device and to the people it
		// messages. whatsmeow refuses to send presence without one, and an empty
		// push name makes contacts see "-" as the sender, so default it rather
		// than let the gateway come up unnamed.
		pushName: envOr("PUSH_NAME", "whatsapp-bot"),
	}
	if cfg.token == "" {
		// Failing closed beats running an unauthenticated send endpoint. The
		// Python API sends `Authorization: Bearer <token>`; without a matching
		// value here every send would be rejected anyway.
		log.Fatal("WHATSAPP_BOT_TOKEN is not set: refusing to expose an unauthenticated send endpoint. " +
			"Generate one (openssl rand -hex 32) and set the same value in this service and the API's .env.")
	}
	return cfg
}

func envOr(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

// authorize checks the shared secret in constant time, so a caller cannot learn the
// token one byte at a time by measuring how long a rejection takes.
func authorize(cfg config, r *http.Request) bool {
	header := r.Header.Get("Authorization")
	const prefix = "Bearer "
	if !strings.HasPrefix(header, prefix) {
		return false
	}
	presented := strings.TrimPrefix(header, prefix)
	return subtle.ConstantTimeCompare([]byte(presented), []byte(cfg.token)) == 1
}

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("no .env file found, using environment variables")
	}

	cfg := loadConfig()

	ctx := context.Background()
	container, err := sqlstore.New(ctx, "sqlite3", "file:"+dbPath+"?_foreign_keys=on", nil)
	if err != nil {
		log.Fatalf("failed to open database: %v", err)
	}

	device, err := container.GetFirstDevice(ctx)
	if err != nil {
		log.Fatalf("failed to get device: %v", err)
	}
	// Set before the client is built: whatsmeow reads the push name off the store
	// when it reports presence, and WhatsApp keeps showing the old name until it
	// has been sent at least once over a live socket.
	device.PushName = cfg.pushName

	clientLog := waLog.Stdout("Client", "WARN", true)
	cli := whatsmeow.NewClient(device, clientLog)

	// A logout is terminal: the session in store.db can no longer authenticate, and
	// this process cannot re-pair on its own. Exiting non-zero means a supervisor
	// restarts us into a visible failure instead of leaving a process running whose
	// socket is dead and whose only symptom is a permanent 503 from /send.
	loggedOut := make(chan struct{})
	cli.AddEventHandler(func(evt any) {
		switch e := evt.(type) {
		case *events.Message:
			log.Printf("message from %s: %s", e.Info.Sender, e.Message.GetConversation())
		case *events.Connected:
			log.Println("connected to WhatsApp")
		case *events.Disconnected:
			log.Println("disconnected from WhatsApp")
		case *events.LoggedOut:
			log.Printf("logged out (%v): stop the bot, delete %s and %s, then run again to re-pair",
				e.Reason, dbPath, qrImagePath)
			select {
			case <-loggedOut:
			default:
				close(loggedOut)
			}
		}
	})

	mux := http.NewServeMux()
	mux.HandleFunc("POST /send", func(w http.ResponseWriter, r *http.Request) {
		if !authorize(cfg, r) {
			w.Header().Set("WWW-Authenticate", "Bearer")
			httpError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		handleSend(w, r, cli)
	})
	// Unauthenticated on purpose: it exposes only whether the gateway is up and
	// paired, which is what a readiness probe needs and is not a secret.
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		paired := cli.IsLoggedIn()
		writeJSON(w, http.StatusOK, map[string]any{
			"ok":     true,
			"paired": paired,
			// Ready to send, which is what a probe actually cares about: the socket can
			// be up over a QR pairing that has not completed, and reporting that as
			// "connected" would send callers looking in the wrong place.
			"connected": paired && cli.IsConnected(),
		})
	})

	// Bind before pairing so a port clash fails immediately and, more importantly,
	// so the API gets a clean 503 ("not connected to WhatsApp") while the QR scan
	// is still pending instead of a connection error it cannot classify.
	address := net.JoinHostPort(cfg.host, cfg.port)
	listener, err := net.Listen("tcp", address)
	if err != nil {
		log.Fatalf("failed to listen on %s: %v", address, err)
	}
	server := &http.Server{Handler: mux}
	go func() {
		if err := server.Serve(listener); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server failed: %v", err)
		}
	}()
	log.Printf("gateway listening on http://%s (POST /send requires a bearer token)", address)

	if !cli.IsLoggedIn() {
		if device.ID != nil {
			// store.db still holds an identity that the server no longer accepts, so
			// whatsmeow will refuse to hand out a QR code. Say what to delete rather
			// than surfacing a library error about a user ID in the store.
			log.Fatalf("%s holds a session that is no longer logged in; delete it (and %s) and run again to re-pair",
				dbPath, qrImagePath)
		}
		if err := pairWithQR(ctx, cli); err != nil {
			log.Fatalf("pairing failed: %v", err)
		}
	} else if err := cli.Connect(); err != nil {
		log.Fatalf("failed to connect: %v", err)
	}

	if err := cli.SendPresence(ctx, types.PresenceAvailable); err != nil {
		log.Printf("failed to send presence: %v", err)
	}
	log.Println("ready: WhatsApp connected")

	// main returning ends the process, and with it the WhatsApp socket and the HTTP
	// server: the linked device drops straight back off WhatsApp, which reads as a
	// failed link even though pairing itself reported success. Block here until a
	// signal (or a logout) asks us to stop.
	signalCtx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	select {
	case <-signalCtx.Done():
		log.Println("shutting down")
	case <-loggedOut:
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Printf("http shutdown: %v", err)
	}
	cli.Disconnect()
}

func pairWithQR(ctx context.Context, cli *whatsmeow.Client) error {
	qrChan, err := cli.GetQRChannel(ctx)
	if err != nil {
		return err
	}

	if err := cli.Connect(); err != nil {
		return err
	}

	log.Println("scan the QR code in qr.png with your phone (WhatsApp > Linked Devices)")

	for evt := range qrChan {
		switch evt.Event {
		case "code":
			if err := qrcode.WriteFile(evt.Code, qrcode.Medium, 256, qrImagePath); err != nil {
				log.Printf("failed to write QR image: %v", err)
			} else {
				log.Printf("new QR code saved to %s (expires in %s)", qrImagePath, evt.Timeout)
			}
			fmt.Print(renderTerminalQR(evt.Code))
		case "success":
			log.Println("pairing successful")
			os.Remove(qrImagePath)
			return nil
		case "error":
			return evt.Error
		default:
			log.Printf("pairing event: %s", evt.Event)
		}
	}
	return fmt.Errorf("QR channel closed before pairing completed")
}

func handleSend(w http.ResponseWriter, r *http.Request, cli *whatsmeow.Client) {
	r.Body = http.MaxBytesReader(w, r.Body, maxUpload)
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		httpError(w, http.StatusBadRequest, "invalid multipart form: %v", err)
		return
	}

	jid, err := phoneToJID(r.FormValue("phone"))
	if err != nil {
		httpError(w, http.StatusBadRequest, "%v", err)
		return
	}

	caption := r.FormValue("message")

	// A connected websocket is not a usable account: without a paired device there is
	// no JID to send from, and SendMessage fails deep in the store with a 500. Report
	// 503 instead, which the API treats as a non-retryable operator problem rather
	// than burning three attempts on a gateway nobody has scanned yet.
	if !cli.IsLoggedIn() || !cli.IsConnected() {
		httpError(w, http.StatusServiceUnavailable, "not connected to WhatsApp")
		return
	}

	var msg *waE2E.Message

	switch {
	case len(r.MultipartForm.File["image"]) > 0:
		data, mediaType, err := readFile(r, "image")
		if err != nil {
			httpError(w, http.StatusBadRequest, "failed to read image: %v", err)
			return
		}
		if !strings.HasPrefix(mediaType, "image/") {
			httpError(w, http.StatusBadRequest, "image file must be of type image/*, got %s", mediaType)
			return
		}
		msg, err = buildImageMessage(cli, data, mediaType, caption)
		if err != nil {
			httpError(w, http.StatusInternalServerError, "failed to upload image: %v", err)
			return
		}
	case len(r.MultipartForm.File["attachment"]) > 0:
		data, _, err := readFile(r, "attachment")
		if err != nil {
			httpError(w, http.StatusBadRequest, "failed to read attachment: %v", err)
			return
		}
		fh := r.MultipartForm.File["attachment"][0]
		msg, err = buildDocumentMessage(cli, data, fh.Filename, fh.Header.Get("Content-Type"), caption)
		if err != nil {
			httpError(w, http.StatusInternalServerError, "failed to upload attachment: %v", err)
			return
		}
	default:
		if caption == "" {
			httpError(w, http.StatusBadRequest, "provide a message, image or attachment")
			return
		}
		msg = &waE2E.Message{Conversation: proto.String(caption)}
	}

	resp, err := cli.SendMessage(r.Context(), jid, msg)
	if err != nil {
		httpError(w, http.StatusInternalServerError, "failed to send: %v", err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"ok":  true,
		"id":  resp.ID,
		"jid": jid.String(),
	})
}

func readFile(r *http.Request, field string) ([]byte, string, error) {
	f, fh, err := r.FormFile(field)
	if err != nil {
		return nil, "", err
	}
	defer f.Close()

	data, err := io.ReadAll(io.LimitReader(f, maxUpload+1))
	if err != nil {
		return nil, "", err
	}
	if len(data) > maxUpload {
		return nil, "", fmt.Errorf("file exceeds %d byte limit", maxUpload)
	}

	mediaType := fh.Header.Get("Content-Type")
	if mediaType == "" || mediaType == "application/octet-stream" {
		mediaType = http.DetectContentType(data)
	}
	if fh.Filename != "" {
		if extType := mime.TypeByExtension(filepath.Ext(fh.Filename)); extType != "" && strings.HasPrefix(extType, "image/") {
			mediaType = extType
		}
	}
	return data, mediaType, nil
}

func buildImageMessage(cli *whatsmeow.Client, data []byte, mediaType, caption string) (*waE2E.Message, error) {
	resp, err := cli.Upload(context.Background(), data, whatsmeow.MediaImage)
	if err != nil {
		return nil, err
	}
	return &waE2E.Message{
		ImageMessage: &waE2E.ImageMessage{
			Caption:       proto.String(caption),
			Mimetype:      proto.String(mediaType),
			URL:           &resp.URL,
			DirectPath:    &resp.DirectPath,
			MediaKey:      resp.MediaKey,
			FileEncSHA256: resp.FileEncSHA256,
			FileSHA256:    resp.FileSHA256,
			FileLength:    &resp.FileLength,
		},
	}, nil
}

func buildDocumentMessage(cli *whatsmeow.Client, data []byte, filename, mediaType, caption string) (*waE2E.Message, error) {
	if len(data) == 0 {
		return nil, fmt.Errorf("empty document")
	}
	if mediaType == "" || mediaType == "application/octet-stream" {
		mediaType = http.DetectContentType(data)
	}
	if filename == "" {
		filename = "file"
	}
	resp, err := cli.Upload(context.Background(), data, whatsmeow.MediaDocument)
	if err != nil {
		return nil, err
	}
	return &waE2E.Message{
		DocumentMessage: &waE2E.DocumentMessage{
			Caption:       proto.String(caption),
			Mimetype:      proto.String(mediaType),
			FileName:      proto.String(filename),
			URL:           &resp.URL,
			DirectPath:    &resp.DirectPath,
			MediaKey:      resp.MediaKey,
			FileEncSHA256: resp.FileEncSHA256,
			FileSHA256:    resp.FileSHA256,
			FileLength:    &resp.FileLength,
		},
	}, nil
}

func phoneToJID(raw string) (types.JID, error) {
	raw = strings.TrimSpace(raw)
	raw = strings.ReplaceAll(raw, " ", "")
	raw = strings.TrimPrefix(raw, "+")
	if !phonePattern.MatchString(raw) {
		return types.JID{}, fmt.Errorf("invalid phone number %q", raw)
	}
	return types.NewJID(raw, types.DefaultUserServer), nil
}

func httpError(w http.ResponseWriter, status int, format string, args ...any) {
	writeJSON(w, status, map[string]any{"ok": false, "error": fmt.Sprintf(format, args...)})
}

func writeJSON(w http.ResponseWriter, status int, body map[string]any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func renderTerminalQR(content string) string {
	qr, err := qrcode.New(content, qrcode.Medium)
	if err != nil {
		log.Printf("failed to generate QR for terminal: %v", err)
		return ""
	}

	// Bitmap includes the 4-module quiet zone. bitmap[y][x] == true means dark.
	bitmap := qr.Bitmap()

	const (
		upperHalf = '▀'
		lowerHalf = '▄'
		fullBlock = '█'
		blank     = ' '
	)

	var sb strings.Builder
	for row := 0; row < len(bitmap); row += 2 {
		for col := 0; col < len(bitmap); col++ {
			top := bitmap[row][col]
			bottom := row+1 < len(bitmap) && bitmap[row+1][col]

			var ch rune
			switch {
			case top && bottom:
				ch = fullBlock
			case top:
				ch = upperHalf
			case bottom:
				ch = lowerHalf
			default:
				ch = blank
			}
			sb.WriteRune(ch)
			sb.WriteRune(ch)
		}
		sb.WriteByte('\n')
	}
	return sb.String()
}
