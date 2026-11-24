package api

import (
	"database/sql"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/syumai/workers-go/cloudflare"
	"github.com/syumai/workers-go/cloudflare/r2"

	"github.com/mindsgn/travel-safe/api/internal/id"
	"github.com/mindsgn/travel-safe/api/internal/media"
	"github.com/mindsgn/travel-safe/api/internal/model"
	"github.com/mindsgn/travel-safe/api/internal/store"
	"github.com/mindsgn/travel-safe/api/internal/timeutil"
	"github.com/mindsgn/travel-safe/api/internal/validate"
)

const Version = "1.0.0"

type Server struct {
	mux *http.ServeMux
}

func New() *Server {
	s := &Server{mux: http.NewServeMux()}
	s.routes()
	return s
}

func (s *Server) routes() {
	s.mux.HandleFunc("GET /health", s.health)
	s.mux.HandleFunc("GET /", s.root)

	s.mux.HandleFunc("POST /v1/users", s.wrap(s.createUser))
	s.mux.HandleFunc("GET /v1/me", s.auth(s.getMe))
	s.mux.HandleFunc("PATCH /v1/me", s.auth(s.updateMe))
	s.mux.HandleFunc("PUT /v1/me", s.auth(s.updateMe))
	s.mux.HandleFunc("DELETE /v1/me", s.auth(s.deleteMe))

	s.mux.HandleFunc("POST /v1/check-ins", s.auth(s.createCheckIn))
	s.mux.HandleFunc("GET /v1/check-ins", s.auth(s.listCheckIns))

	s.mux.HandleFunc("POST /v1/locations", s.auth(s.createLocation))
	s.mux.HandleFunc("GET /v1/locations", s.auth(s.listLocations))

	s.mux.HandleFunc("GET /v1/contacts", s.auth(s.listContacts))
	s.mux.HandleFunc("POST /v1/contacts", s.auth(s.createContact))
	s.mux.HandleFunc("GET /v1/contacts/{id}", s.auth(s.getContact))
	s.mux.HandleFunc("PATCH /v1/contacts/{id}", s.auth(s.updateContact))
	s.mux.HandleFunc("PUT /v1/contacts/{id}", s.auth(s.updateContact))
	s.mux.HandleFunc("DELETE /v1/contacts/{id}", s.auth(s.deleteContact))
	s.mux.HandleFunc("POST /v1/contacts/{id}/revoke", s.auth(s.revokeContact))
	s.mux.HandleFunc("POST /v1/contacts/{id}/restore", s.auth(s.restoreContact))

	s.mux.HandleFunc("POST /v1/sos", s.auth(s.createSOS))
	s.mux.HandleFunc("GET /v1/sos", s.auth(s.listSOS))
	s.mux.HandleFunc("GET /v1/sos/{id}/media", s.auth(s.ownerMedia))

	s.mux.HandleFunc("GET /v1/emergency-link", s.auth(s.getEmergencyLink))
	s.mux.HandleFunc("POST /v1/emergency-link/rotate", s.auth(s.rotateEmergencyLink))

	s.mux.HandleFunc("GET /v1/emergency/{token}", s.publicEmergency)
	s.mux.HandleFunc("GET /v1/emergency/{token}/media/{id}", s.publicMedia)
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.cors(w, r)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Referrer-Policy", "no-referrer")
	s.mux.ServeHTTP(w, r)
}

func (s *Server) cors(w http.ResponseWriter, r *http.Request) {
	origin := r.Header.Get("Origin")
	allowed := strings.TrimSpace(cloudflare.Getenv("WEB_ORIGIN"))
	if allowed == "" || allowed == "*" {
		if origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
		} else {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		}
	} else if origin != "" {
		for _, candidate := range strings.Split(allowed, ",") {
			if strings.TrimSpace(candidate) == origin {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Vary", "Origin")
				break
			}
		}
	}
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-TravelSafe-Message")
	w.Header().Set("Access-Control-Max-Age", "86400")
}

func emergencyBase() string {
	return strings.TrimRight(strings.TrimSpace(cloudflare.Getenv("EMERGENCY_BASE_URL")), "/")
}

func emergencyURL(token string) string {
	if base := emergencyBase(); base != "" {
		return base + "/emergency/" + token
	}
	return "/emergency/" + token
}

func mediaPath(kind, token, sosID string) string {
	if kind == "message" {
		return ""
	}
	return "/v1/emergency/" + token + "/media/" + sosID
}

func (s *Server) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"ok": true, "service": "travel-safe-api", "version": Version, "time": timeutil.Now(),
	})
}

func (s *Server) root(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		writeError(w, http.StatusNotFound, "not_found", "This endpoint does not exist.", "")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"service": "Travel Safe API", "version": Version,
		"docs": "https://github.com/mindsgn/travel-safe",
	})
}

// --- middleware -----------------------------------------------------------------

type handlerWithStore func(*store.Store, http.ResponseWriter, *http.Request)
type handlerWithUser func(*store.Store, *model.User, http.ResponseWriter, *http.Request)

func (s *Server) wrap(fn handlerWithStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		st, err := store.Open()
		if err != nil {
			writeUnexpected(w, err)
			return
		}
		defer st.Close()
		fn(st, w, r)
	}
}

func (s *Server) auth(fn handlerWithUser) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		key := bearer(r)
		if key == "" {
			writeError(w, http.StatusUnauthorized, "unauthorized", "Send your API key as a Bearer token.", "")
			return
		}
		st, err := store.Open()
		if err != nil {
			writeUnexpected(w, err)
			return
		}
		defer st.Close()
		user, err := st.UserByAPIKeyHash(r.Context(), id.Hash(key))
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				writeError(w, http.StatusUnauthorized, "unauthorized", "That API key is not valid.", "")
				return
			}
			writeUnexpected(w, err)
			return
		}
		fn(st, user, w, r)
	}
}

func bearer(r *http.Request) string {
	value := strings.TrimSpace(r.Header.Get("Authorization"))
	if len(value) > 7 && strings.EqualFold(value[:7], "Bearer ") {
		return strings.TrimSpace(value[7:])
	}
	return strings.TrimSpace(r.Header.Get("X-API-Key"))
}

// --- presenters -----------------------------------------------------------------

type userView struct {
	ID                     string  `json:"id"`
	Name                   string  `json:"name"`
	Email                  *string `json:"email"`
	Phone                  *string `json:"phone"`
	CheckInIntervalMinutes *int    `json:"check_in_interval_minutes"`
	GraceMinutes           int     `json:"grace_minutes"`
	Timezone               *string `json:"timezone"`
	LastCheckInAt          string  `json:"last_check_in_at"`
	CheckInDueAt           *string `json:"check_in_due_at"`
	TriggerDueAt           *string `json:"trigger_due_at"`
	Status                 string  `json:"status"`
	TriggeredAt            *string `json:"triggered_at"`
	TriggerReason          *string `json:"trigger_reason"`
	CreatedAt              string  `json:"created_at"`
	UpdatedAt              string  `json:"updated_at"`
}

func viewUser(u *model.User) userView {
	now := timeutil.Now()
	view := userView{
		ID: u.ID, Name: u.Name, Email: u.Email, Phone: u.Phone,
		CheckInIntervalMinutes: u.CheckInIntervalMinutes, GraceMinutes: u.GraceMinutes,
		Timezone: u.Timezone, LastCheckInAt: u.LastCheckInAt,
		Status: model.Status(u, mustTime(now)), TriggeredAt: u.TriggeredAt,
		TriggerReason: u.TriggerReason, CreatedAt: u.CreatedAt, UpdatedAt: u.UpdatedAt,
	}
	if u.CheckInIntervalMinutes != nil {
		due := timeutil.AddMinutes(u.LastCheckInAt, *u.CheckInIntervalMinutes)
		view.CheckInDueAt = &due
		triggerDue := timeutil.AddMinutes(due, u.GraceMinutes)
		view.TriggerDueAt = &triggerDue
	}
	return view
}

func mustTime(value string) time.Time {
	t, _ := timeutil.Parse(value)
	return t
}

type contactView struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	Email     *string `json:"email"`
	Phone     *string `json:"phone"`
	AccessURL *string `json:"access_url"`
	RevokedAt *string `json:"revoked_at"`
	CreatedAt string  `json:"created_at"`
	UpdatedAt string  `json:"updated_at"`
}

func viewContact(c *model.Contact) contactView {
	view := contactView{
		ID: c.ID, Name: c.Name, Email: c.Email, Phone: c.Phone,
		RevokedAt: c.RevokedAt, CreatedAt: c.CreatedAt, UpdatedAt: c.UpdatedAt,
	}
	if c.AccessToken != nil && *c.AccessToken != "" {
		url := emergencyURL(*c.AccessToken)
		view.AccessURL = &url
	}
	return view
}

func viewLocation(l *model.Location) model.Location { return *l }

func viewSOS(e *model.SOS, token string) map[string]any {
	item := map[string]any{
		"id": e.ID, "kind": e.Kind, "message": e.Message,
		"content_type": e.ContentType, "size_bytes": e.SizeBytes, "created_at": e.CreatedAt,
	}
	if path := mediaPath(e.Kind, token, e.ID); path != "" {
		item["media_path"] = path
	}
	return item
}

type createUserRequest struct {
	Name                   string `json:"name"`
	Email                  string `json:"email"`
	Phone                  string `json:"phone"`
	CheckInIntervalMinutes *int   `json:"check_in_interval_minutes"`
	GraceMinutes           *int   `json:"grace_minutes"`
	Timezone               string `json:"timezone"`
}

func (s *Server) createUser(st *store.Store, w http.ResponseWriter, r *http.Request) {
	var req createUserRequest
	if err := decodeJSON(w, r, &req); err != nil {
		writeValidation(w, err)
		return
	}
	name, err := validate.Name(req.Name)
	if err != nil {
		writeValidation(w, err)
		return
	}
	email, err := validate.Email(req.Email)
	if err != nil {
		writeValidation(w, err)
		return
	}
	phone, err := validate.Phone(req.Phone)
	if err != nil {
		writeValidation(w, err)
		return
	}
	grace, err := validate.Grace(req.GraceMinutes)
	if err != nil {
		writeValidation(w, err)
		return
	}
	tz, err := validate.Timezone(req.Timezone)
	if err != nil {
		writeValidation(w, err)
		return
	}
	intervalValue := req.CheckInIntervalMinutes
	if intervalValue == nil {
		// A new safety account starts with a 24-hour cycle. Send 0 to disable
		// the dead-man switch entirely.
		defaultInterval := 1440
		intervalValue = &defaultInterval
	}
	interval, err := validate.Interval(intervalValue)
	if err != nil {
		writeValidation(w, err)
		return
	}

	now := timeutil.Now()
	apiKey := id.APIKey()
	user := &model.User{
		ID: id.New(), Name: name, CheckInIntervalMinutes: interval,
		GraceMinutes: grace, LastCheckInAt: now, CreatedAt: now, UpdatedAt: now,
		APIKeyHash: id.Hash(apiKey), EmergencyToken: id.Token(),
	}
	if email != "" {
		user.Email = &email
	}
	if phone != "" {
		user.Phone = &phone
	}
	if tz != "" {
		user.Timezone = &tz
	}
	if err := st.CreateUser(r.Context(), user); err != nil {
		writeUnexpected(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{
		"user":          viewUser(user),
		"api_key":       apiKey,
		"emergency_url": emergencyURL(user.EmergencyToken),
		"notice":        "Store this API key now. It is not shown again.",
	})
}

func (s *Server) getMe(st *store.Store, user *model.User, w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"user": viewUser(user), "emergency_url": emergencyURL(user.EmergencyToken),
	})
}

type updateUserRequest struct {
	Name                   *string `json:"name"`
	Email                  *string `json:"email"`
	Phone                  *string `json:"phone"`
	CheckInIntervalMinutes *int    `json:"check_in_interval_minutes"`
	GraceMinutes           *int    `json:"grace_minutes"`
	Timezone               *string `json:"timezone"`
}

func (s *Server) updateMe(st *store.Store, user *model.User, w http.ResponseWriter, r *http.Request) {
	var req updateUserRequest
	if err := decodeJSON(w, r, &req); err != nil {
		writeValidation(w, err)
		return
	}
	if req.Name != nil {
		name, err := validate.Name(*req.Name)
		if err != nil {
			writeValidation(w, err)
			return
		}
		user.Name = name
	}
	if req.Email != nil {
		email, err := validate.Email(*req.Email)
		if err != nil {
			writeValidation(w, err)
			return
		}
		user.Email = optionalString(email)
	}
	if req.Phone != nil {
		phone, err := validate.Phone(*req.Phone)
		if err != nil {
			writeValidation(w, err)
			return
		}
		user.Phone = optionalString(phone)
	}
	if req.CheckInIntervalMinutes != nil {
		interval, err := validate.Interval(req.CheckInIntervalMinutes)
		if err != nil {
			writeValidation(w, err)
			return
		}
		user.CheckInIntervalMinutes = interval
	}
	if req.GraceMinutes != nil {
		grace, err := validate.Grace(req.GraceMinutes)
		if err != nil {
			writeValidation(w, err)
			return
		}
		user.GraceMinutes = grace
	}
	if req.Timezone != nil {
		tz, err := validate.Timezone(*req.Timezone)
		if err != nil {
			writeValidation(w, err)
			return
		}
		user.Timezone = optionalString(tz)
	}
	user.UpdatedAt = timeutil.Now()
	if err := st.UpdateUser(r.Context(), user); err != nil {
		writeUnexpected(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"user": viewUser(user), "emergency_url": emergencyURL(user.EmergencyToken),
	})
}

func optionalString(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}

func (s *Server) deleteMe(st *store.Store, user *model.User, w http.ResponseWriter, r *http.Request) {
	if err := st.DeleteUser(r.Context(), user.ID); err != nil {
		writeUnexpected(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"deleted": true})
}

type checkInRequest struct {
	Note     string           `json:"note"`
	Location *locationRequest `json:"location"`
}

func (s *Server) createCheckIn(st *store.Store, user *model.User, w http.ResponseWriter, r *http.Request) {
	var req checkInRequest
	// Check-in may be empty, so only parse when there is a body.
	if r.ContentLength > 0 {
		if err := decodeJSON(w, r, &req); err != nil {
			writeValidation(w, err)
			return
		}
	}
	note, err := validate.Message(req.Note)
	if err != nil {
		writeValidation(w, err)
		return
	}
	now := timeutil.Now()
	// Validate and build the optional location before resetting the switch, so a
	// bad latitude cannot silently mark the user safe.
	var location *model.Location
	if req.Location != nil {
		location, err = buildLocation(user.ID, req.Location, now)
		if err != nil {
			writeValidation(w, err)
			return
		}
	}
	resolved, err := st.RecordCheckIn(r.Context(), user.ID, id.New(), note, now)
	if err != nil {
		writeUnexpected(w, err)
		return
	}
	if location != nil {
		if err := st.InsertLocation(r.Context(), location); err != nil {
			writeUnexpected(w, err)
			return
		}
	}
	user.LastCheckInAt = now
	user.WarningSentFor = nil
	user.TriggeredAt = nil
	user.TriggerReason = nil
	user.UpdatedAt = now
	writeJSON(w, http.StatusCreated, map[string]any{
		"check_in_at": now, "resolved_events": resolved, "user": viewUser(user),
	})
}

func (s *Server) listCheckIns(st *store.Store, user *model.User, w http.ResponseWriter, r *http.Request) {
	items, err := st.ListCheckIns(r.Context(), user.ID, 50)
	if err != nil {
		writeUnexpected(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"check_ins": items, "user": viewUser(user)})
}

type locationRequest struct {
	Latitude   float64  `json:"latitude"`
	Longitude  float64  `json:"longitude"`
	AccuracyM  *float64 `json:"accuracy_m"`
	RecordedAt string   `json:"recorded_at"`
}

func buildLocation(userID string, req *locationRequest, now string) (*model.Location, error) {
	if err := validate.Latitude(req.Latitude); err != nil {
		return nil, err
	}
	if err := validate.Longitude(req.Longitude); err != nil {
		return nil, err
	}
	if err := validate.Accuracy(req.AccuracyM); err != nil {
		return nil, err
	}
	recorded := req.RecordedAt
	if recorded == "" {
		recorded = now
	} else if _, err := timeutil.Parse(recorded); err != nil {
		return nil, &validate.FieldError{Field: "recorded_at", Message: "Use an RFC 3339 timestamp in UTC."}
	}
	return &model.Location{
		ID: id.New(), UserID: userID, Latitude: req.Latitude, Longitude: req.Longitude,
		AccuracyM: req.AccuracyM, RecordedAt: recorded, CreatedAt: now,
	}, nil
}

func (s *Server) createLocation(st *store.Store, user *model.User, w http.ResponseWriter, r *http.Request) {
	var req locationRequest
	if err := decodeJSON(w, r, &req); err != nil {
		writeValidation(w, err)
		return
	}
	now := timeutil.Now()
	location, err := buildLocation(user.ID, &req, now)
	if err != nil {
		writeValidation(w, err)
		return
	}
	if err := st.InsertLocation(r.Context(), location); err != nil {
		writeUnexpected(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"location": viewLocation(location), "retention_days": 7})
}

func (s *Server) listLocations(st *store.Store, user *model.User, w http.ResponseWriter, r *http.Request) {
	days := 7
	if raw := r.URL.Query().Get("days"); raw != "" {
		if _, err := fmt.Sscanf(raw, "%d", &days); err != nil || days < 1 || days > 7 {
			writeValidation(w, &validate.FieldError{Field: "days", Message: "Days must be between 1 and 7."})
			return
		}
	}
	since := timeutil.Since(days)
	items, err := st.ListLocations(r.Context(), user.ID, since, 500)
	if err != nil {
		writeUnexpected(w, err)
		return
	}
	views := make([]model.Location, 0, len(items))
	for _, item := range items {
		views = append(views, viewLocation(item))
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"locations": views, "retention_days": 7, "since": since,
	})
}

// --- contacts -------------------------------------------------------------------

type contactRequest struct {
	Name  string `json:"name"`
	Email string `json:"email"`
	Phone string `json:"phone"`
}

func (s *Server) createContact(st *store.Store, user *model.User, w http.ResponseWriter, r *http.Request) {
	var req contactRequest
	if err := decodeJSON(w, r, &req); err != nil {
		writeValidation(w, err)
		return
	}
	name, email, phone, err := validate.Contact(req.Name, req.Email, req.Phone)
	if err != nil {
		writeValidation(w, err)
		return
	}
	now := timeutil.Now()
	token := id.Token()
	contact := &model.Contact{
		ID: id.New(), UserID: user.ID, Name: name, Email: optionalString(email),
		Phone: optionalString(phone), AccessToken: &token, CreatedAt: now, UpdatedAt: now,
	}
	if err := st.CreateContact(r.Context(), contact); err != nil {
		writeUnexpected(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"contact": viewContact(contact)})
}

func (s *Server) listContacts(st *store.Store, user *model.User, w http.ResponseWriter, r *http.Request) {
	items, err := st.ListContacts(r.Context(), user.ID)
	if err != nil {
		writeUnexpected(w, err)
		return
	}
	views := make([]contactView, 0, len(items))
	for _, item := range items {
		views = append(views, viewContact(item))
	}
	writeJSON(w, http.StatusOK, map[string]any{"contacts": views})
}

func (s *Server) getContact(st *store.Store, user *model.User, w http.ResponseWriter, r *http.Request) {
	contact, err := st.ContactByID(r.Context(), user.ID, r.PathValue("id"))
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeError(w, http.StatusNotFound, "contact_not_found", "That contact does not exist.", "")
			return
		}
		writeUnexpected(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"contact": viewContact(contact)})
}

type updateContactRequest struct {
	Name  *string `json:"name"`
	Email *string `json:"email"`
	Phone *string `json:"phone"`
}

func (s *Server) updateContact(st *store.Store, user *model.User, w http.ResponseWriter, r *http.Request) {
	contact, err := st.ContactByID(r.Context(), user.ID, r.PathValue("id"))
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeError(w, http.StatusNotFound, "contact_not_found", "That contact does not exist.", "")
			return
		}
		writeUnexpected(w, err)
		return
	}
	var req updateContactRequest
	if err := decodeJSON(w, r, &req); err != nil {
		writeValidation(w, err)
		return
	}
	name, email, phone := contact.Name, valueOrEmpty(contact.Email), valueOrEmpty(contact.Phone)
	if req.Name != nil {
		name = *req.Name
	}
	if req.Email != nil {
		email = *req.Email
	}
	if req.Phone != nil {
		phone = *req.Phone
	}
	cleanName, cleanEmail, cleanPhone, err := validate.Contact(name, email, phone)
	if err != nil {
		writeValidation(w, err)
		return
	}
	contact.Name = cleanName
	contact.Email = optionalString(cleanEmail)
	contact.Phone = optionalString(cleanPhone)
	contact.UpdatedAt = timeutil.Now()
	if err := st.UpdateContact(r.Context(), contact); err != nil {
		writeUnexpected(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"contact": viewContact(contact)})
}

func valueOrEmpty(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func (s *Server) deleteContact(st *store.Store, user *model.User, w http.ResponseWriter, r *http.Request) {
	if err := st.DeleteContact(r.Context(), user.ID, r.PathValue("id")); err != nil {
		writeUnexpected(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"deleted": true})
}

func (s *Server) revokeContact(st *store.Store, user *model.User, w http.ResponseWriter, r *http.Request) {
	contact, err := st.ContactByID(r.Context(), user.ID, r.PathValue("id"))
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeError(w, http.StatusNotFound, "contact_not_found", "That contact does not exist.", "")
			return
		}
		writeUnexpected(w, err)
		return
	}
	now := timeutil.Now()
	contact.AccessToken = nil
	contact.RevokedAt = &now
	contact.UpdatedAt = now
	if err := st.UpdateContact(r.Context(), contact); err != nil {
		writeUnexpected(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"contact": viewContact(contact), "revoked": true})
}

func (s *Server) restoreContact(st *store.Store, user *model.User, w http.ResponseWriter, r *http.Request) {
	contact, err := st.ContactByID(r.Context(), user.ID, r.PathValue("id"))
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeError(w, http.StatusNotFound, "contact_not_found", "That contact does not exist.", "")
			return
		}
		writeUnexpected(w, err)
		return
	}
	token := id.Token()
	now := timeutil.Now()
	contact.AccessToken = &token
	contact.RevokedAt = nil
	contact.UpdatedAt = now
	if err := st.UpdateContact(r.Context(), contact); err != nil {
		writeUnexpected(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"contact": viewContact(contact)})
}

// --- emergency link -------------------------------------------------------------

func (s *Server) getEmergencyLink(_ *store.Store, user *model.User, w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"emergency_url": emergencyURL(user.EmergencyToken),
		"expires":       false,
		"notice":        "Anyone with this link can see your active emergency, SOS media and last 7 days of locations. Rotate it to revoke access.",
	})
}

type rotateRequest struct {
	RevokeContacts bool `json:"revoke_contacts"`
}

func (s *Server) rotateEmergencyLink(st *store.Store, user *model.User, w http.ResponseWriter, r *http.Request) {
	var req rotateRequest
	if r.ContentLength != 0 {
		if err := decodeJSON(w, r, &req); err != nil {
			writeValidation(w, err)
			return
		}
	}
	now := timeutil.Now()
	token := id.Token()
	if err := st.RotateEmergencyToken(r.Context(), user.ID, token, now); err != nil {
		writeUnexpected(w, err)
		return
	}
	revoked := 0
	if req.RevokeContacts {
		contacts, err := st.ListContacts(r.Context(), user.ID)
		if err != nil {
			writeUnexpected(w, err)
			return
		}
		for _, contact := range contacts {
			if contact.AccessToken == nil {
				continue
			}
			contact.AccessToken = nil
			contact.RevokedAt = &now
			contact.UpdatedAt = now
			if err := st.UpdateContact(r.Context(), contact); err != nil {
				writeUnexpected(w, err)
				return
			}
			revoked++
		}
	}
	user.EmergencyToken = token
	writeJSON(w, http.StatusOK, map[string]any{
		"emergency_url": emergencyURL(token), "contacts_revoked": revoked,
	})
}

// --- public emergency page ------------------------------------------------------

func (s *Server) resolveToken(st *store.Store, r *http.Request) (*model.User, *model.Contact, error) {
	token := r.PathValue("token")
	owner, err := st.UserByEmergencyToken(r.Context(), token)
	if err == nil {
		return owner, nil, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, nil, err
	}
	contact, err := st.ContactByAccessToken(r.Context(), token)
	if err != nil {
		return nil, nil, err
	}
	user, err := st.UserByID(r.Context(), contact.UserID)
	if err != nil {
		return nil, nil, err
	}
	return user, contact, nil
}

func (s *Server) publicEmergency(w http.ResponseWriter, r *http.Request) {
	st, err := store.Open()
	if err != nil {
		writeUnexpected(w, err)
		return
	}
	defer st.Close()
	user, contact, err := s.resolveToken(st, r)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeError(w, http.StatusNotFound, "emergency_link_invalid",
				"This emergency link is not valid or has been revoked.", "")
			return
		}
		writeUnexpected(w, err)
		return
	}
	active, eventErr := st.ActiveEvent(r.Context(), user.ID)
	if eventErr != nil {
		if !errors.Is(eventErr, sql.ErrNoRows) {
			writeUnexpected(w, eventErr)
			return
		}
		active = nil
	}
	locations, err := st.ListLocations(r.Context(), user.ID, timeutil.Since(7), 500)
	if err != nil {
		writeUnexpected(w, err)
		return
	}
	sos, err := st.ListSOS(r.Context(), user.ID, 20)
	if err != nil {
		writeUnexpected(w, err)
		return
	}
	locationViews := make([]model.Location, 0, len(locations))
	for _, item := range locations {
		locationViews = append(locationViews, *item)
	}
	sosViews := make([]map[string]any, 0, len(sos))
	for _, item := range sos {
		sosViews = append(sosViews, viewSOS(item, r.PathValue("token")))
	}
	viewerKind := "owner"
	viewerName := user.Name
	if contact != nil {
		viewerKind = "contact"
		viewerName = contact.Name
	}
	status := map[string]any{
		"active": active != nil, "reason": nil, "since": nil,
	}
	if active != nil {
		status["reason"] = active.Reason
		status["since"] = active.CreatedAt
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"viewer":         map[string]any{"kind": viewerKind, "name": viewerName},
		"person":         map[string]any{"name": user.Name},
		"status":         status,
		"locations":      locationViews,
		"sos":            sosViews,
		"retention_days": 7,
		"generated_at":   timeutil.Now(),
	})
}

func (s *Server) publicMedia(w http.ResponseWriter, r *http.Request) {
	st, err := store.Open()
	if err != nil {
		writeUnexpected(w, err)
		return
	}
	defer st.Close()
	user, _, err := s.resolveToken(st, r)
	if err != nil {
		writeError(w, http.StatusNotFound, "emergency_link_invalid", "This emergency link is not valid or has been revoked.", "")
		return
	}
	sos, err := st.SOSByID(r.Context(), user.ID, r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusNotFound, "media_not_found", "That SOS media does not exist.", "")
		return
	}
	s.serveMedia(w, r, sos)
}

func (s *Server) ownerMedia(st *store.Store, user *model.User, w http.ResponseWriter, r *http.Request) {
	sos, err := st.SOSByID(r.Context(), user.ID, r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusNotFound, "media_not_found", "That SOS media does not exist.", "")
		return
	}
	s.serveMedia(w, r, sos)
}

func (s *Server) serveMedia(w http.ResponseWriter, r *http.Request, sos *model.SOS) {
	if sos.ObjectKey == nil || *sos.ObjectKey == "" {
		writeError(w, http.StatusNotFound, "media_not_found", "That SOS has no media attachment.", "")
		return
	}
	bucket, err := r2.NewBucket("MEDIA")
	if err != nil {
		writeUnexpected(w, err)
		return
	}
	obj, err := bucket.Get(*sos.ObjectKey)
	if err != nil {
		writeUnexpected(w, err)
		return
	}
	if obj == nil {
		writeError(w, http.StatusNotFound, "media_not_found", "That media object no longer exists.", "")
		return
	}
	body, err := io.ReadAll(obj.Body)
	if err != nil {
		writeUnexpected(w, err)
		return
	}
	contentType := media.SafeContentType(sos.Kind, valueOrEmpty(sos.ContentType))
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Content-Disposition", fmt.Sprintf(`inline; filename="sos-%s%s"`, sos.ID, media.Extension(contentType, sos.Kind)))
	w.Header().Set("Cache-Control", "private, no-store")
	w.Header().Set("Accept-Ranges", "bytes")
	total := int64(len(body))
	start, end, partial, ok := parseRange(r.Header.Get("Range"), total)
	if !ok {
		w.Header().Set("Content-Range", fmt.Sprintf("bytes */%d", total))
		w.WriteHeader(http.StatusRequestedRangeNotSatisfiable)
		return
	}
	if partial {
		w.Header().Set("Content-Range", fmt.Sprintf("bytes %d-%d/%d", start, end, total))
		w.Header().Set("Content-Length", fmt.Sprintf("%d", end-start+1))
		w.WriteHeader(http.StatusPartialContent)
		_, _ = w.Write(body[start : end+1])
		return
	}
	w.Header().Set("Content-Length", fmt.Sprintf("%d", total))
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(body)
}

func parseRange(header string, size int64) (start, end int64, partial, ok bool) {
	if header == "" || size == 0 {
		return 0, size - 1, false, true
	}
	if !strings.HasPrefix(header, "bytes=") {
		return 0, 0, false, false
	}
	spec := strings.TrimPrefix(header, "bytes=")
	parts := strings.SplitN(spec, "-", 2)
	if len(parts) != 2 {
		return 0, 0, false, false
	}
	if parts[0] == "" {
		// Suffix range: last N bytes.
		var n int64
		if _, err := fmt.Sscanf(parts[1], "%d", &n); err != nil || n <= 0 {
			return 0, 0, false, false
		}
		if n > size {
			n = size
		}
		return size - n, size - 1, true, true
	}
	if _, err := fmt.Sscanf(parts[0], "%d", &start); err != nil {
		return 0, 0, false, false
	}
	end = size - 1
	if parts[1] != "" {
		if _, err := fmt.Sscanf(parts[1], "%d", &end); err != nil {
			return 0, 0, false, false
		}
	}
	if start < 0 || start >= size || end < start {
		return 0, 0, false, false
	}
	if end >= size {
		end = size - 1
	}
	return start, end, true, true
}
