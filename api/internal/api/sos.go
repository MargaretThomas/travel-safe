package api

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"mime"
	"net/http"
	"strings"

	"github.com/syumai/workers-go/cloudflare/r2"

	"github.com/mindsgn/travel-safe/api/internal/id"
	"github.com/mindsgn/travel-safe/api/internal/media"
	"github.com/mindsgn/travel-safe/api/internal/model"
	"github.com/mindsgn/travel-safe/api/internal/store"
	"github.com/mindsgn/travel-safe/api/internal/timeutil"
	"github.com/mindsgn/travel-safe/api/internal/validate"
)

type sosMessageRequest struct {
	Message string `json:"message"`
}

// createSOS accepts either a JSON message or a raw binary body. Media is
// uploaded with its own Content-Type (video/*, image/* or audio/*); a message
// is sent as {"message": "..."} or text/plain. The optional
// X-TravelSafe-Message header attaches a caption to media.
func (s *Server) createSOS(st *store.Store, user *model.User, w http.ResponseWriter, r *http.Request) {
	contentType := strings.TrimSpace(r.Header.Get("Content-Type"))
	kind, ok := media.Kind(contentType)
	if !ok {
		writeError(w, http.StatusUnsupportedMediaType, "unsupported_media_type",
			"Send image/*, video/*, audio/*, application/json or text/plain.", "")
		return
	}

	now := timeutil.Now()
	sosID := id.New()
	var (
		objectKey  *string
		storedType *string
		size       *int64
		message    string
	)

	if kind == "message" {
		baseType, _, _ := mime.ParseMediaType(contentType)
		if baseType == "text/plain" {
			raw, err := io.ReadAll(io.LimitReader(r.Body, 4097))
			if err != nil {
				writeValidation(w, err)
				return
			}
			message = string(raw)
		} else {
			var req sosMessageRequest
			if err := decodeJSON(w, r, &req); err != nil {
				writeValidation(w, err)
				return
			}
			message = req.Message
		}
		clean, err := validate.Message(message)
		if err != nil {
			writeValidation(w, err)
			return
		}
		if clean == "" {
			writeValidation(w, &validate.FieldError{Field: "message", Message: "Write a short message, or attach media instead."})
			return
		}
		message = clean
	} else {
		if r.ContentLength > media.MaxUploadBytes {
			writeError(w, http.StatusRequestEntityTooLarge, "file_too_large", "SOS media must be 25 MB or smaller.", "")
			return
		}
		raw, err := io.ReadAll(http.MaxBytesReader(w, r.Body, media.MaxUploadBytes))
		if err != nil {
			var tooLarge *http.MaxBytesError
			if errors.As(err, &tooLarge) {
				writeError(w, http.StatusRequestEntityTooLarge, "file_too_large", "SOS media must be 25 MB or smaller.", "")
				return
			}
			writeValidation(w, err)
			return
		}
		if len(raw) == 0 {
			writeValidation(w, &validate.FieldError{Field: "file", Message: "The uploaded file is empty."})
			return
		}
		caption, err := validate.Message(r.Header.Get("X-TravelSafe-Message"))
		if err != nil {
			writeValidation(w, err)
			return
		}
		message = caption
		key := fmt.Sprintf("sos/%s/%s%s", user.ID, sosID, media.Extension(contentType, kind))
		sizeValue := int64(len(raw))
		stored := media.SafeContentType(kind, contentType)
		if err := putObject(r.Context(), key, raw, stored, user.ID, sosID); err != nil {
			writeUnexpected(w, err)
			return
		}
		objectKey = &key
		storedType = &stored
		size = &sizeValue
	}

	var messagePtr *string
	if message != "" {
		messagePtr = &message
	}
	event := &model.SOS{
		ID: sosID, UserID: user.ID, Kind: kind, Message: messagePtr, ObjectKey: objectKey,
		ContentType: storedType, SizeBytes: size, CreatedAt: now,
	}
	if err := st.CreateSOS(r.Context(), event); err != nil {
		if objectKey != nil {
			_ = deleteObject(r.Context(), *objectKey)
		}
		writeUnexpected(w, err)
		return
	}
	emergency, _, err := st.Trigger(r.Context(), user.ID, "sos", now)
	if err != nil {
		writeUnexpected(w, err)
		return
	}
	user.TriggeredAt = &now
	reason := "sos"
	user.TriggerReason = &reason
	user.WarningSentFor = nil
	user.UpdatedAt = now
	writeJSON(w, http.StatusCreated, map[string]any{
		"sos":           viewSOS(event, user.EmergencyToken),
		"emergency_url": emergencyURL(user.EmergencyToken),
		"emergency": map[string]any{
			"id": emergency.ID, "reason": emergency.Reason, "created_at": emergency.CreatedAt,
		},
		"notice": "Your emergency is active. The hourly worker will notify your emergency contacts and send you a link to this page.",
	})
}

func putObject(ctx context.Context, key string, body []byte, contentType, userID, sosID string) error {
	_ = ctx
	bucket, err := r2.NewBucket("MEDIA")
	if err != nil {
		return err
	}
	_, err = bucket.Put(key, io.NopCloser(bytes.NewReader(body)), &r2.PutOptions{
		HTTPMetadata: r2.HTTPMetadata{ContentType: contentType, CacheControl: "private, no-store"},
		CustomMetadata: map[string]string{
			"user_id": userID,
			"sos_id":  sosID,
		},
	})
	return err
}

func deleteObject(ctx context.Context, key string) error {
	_ = ctx
	bucket, err := r2.NewBucket("MEDIA")
	if err != nil {
		return err
	}
	return bucket.Delete(key)
}

func (s *Server) listSOS(st *store.Store, user *model.User, w http.ResponseWriter, r *http.Request) {
	items, err := st.ListSOS(r.Context(), user.ID, 50)
	if err != nil {
		writeUnexpected(w, err)
		return
	}
	views := make([]map[string]any, 0, len(items))
	for _, item := range items {
		views = append(views, viewSOS(item, user.EmergencyToken))
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"sos": views, "emergency_url": emergencyURL(user.EmergencyToken),
	})
}
