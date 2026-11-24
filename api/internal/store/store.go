package store

import (
	"context"
	"database/sql"
	"fmt"

	_ "github.com/syumai/workers-go/cloudflare/d1" // registers the "d1" driver

	"github.com/mindsgn/travel-safe/api/internal/id"
	"github.com/mindsgn/travel-safe/api/internal/model"
)

// Store is the D1-backed persistence layer. Bindings are resolved from the
// current request context, so a Store is opened per request and closed when the
// request finishes.
type Store struct {
	db *sql.DB
}

func Open() (*Store, error) {
	db, err := sql.Open("d1", "DB")
	if err != nil {
		return nil, fmt.Errorf("open d1: %w", err)
	}
	return &Store{db: db}, nil
}

func (s *Store) Close() error { return s.db.Close() }

const userColumns = `id, name, email, phone, api_key_hash, emergency_token,
	check_in_interval_minutes, grace_minutes, timezone, last_check_in_at,
	warning_sent_for, triggered_at, trigger_reason, created_at, updated_at`

func scanUser(row interface{ Scan(...any) error }) (*model.User, error) {
	var (
		u          model.User
		email      sql.NullString
		phone      sql.NullString
		interval   sql.NullInt64
		timezone   sql.NullString
		warning    sql.NullString
		triggered  sql.NullString
		triggerWhy sql.NullString
	)
	err := row.Scan(
		&u.ID, &u.Name, &email, &phone, &u.APIKeyHash, &u.EmergencyToken,
		&interval, &u.GraceMinutes, &timezone, &u.LastCheckInAt,
		&warning, &triggered, &triggerWhy, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	u.Email = nullStringPtr(email)
	u.Phone = nullStringPtr(phone)
	u.Timezone = nullStringPtr(timezone)
	u.WarningSentFor = nullStringPtr(warning)
	u.TriggeredAt = nullStringPtr(triggered)
	u.TriggerReason = nullStringPtr(triggerWhy)
	if interval.Valid {
		v := int(interval.Int64)
		u.CheckInIntervalMinutes = &v
	}
	return &u, nil
}

func nullStringPtr(v sql.NullString) *string {
	if !v.Valid {
		return nil
	}
	value := v.String
	return &value
}

func nullFloatPtr(v sql.NullFloat64) *float64 {
	if !v.Valid {
		return nil
	}
	value := v.Float64
	return &value
}

func nullInt64Ptr(v sql.NullInt64) *int64 {
	if !v.Valid {
		return nil
	}
	value := v.Int64
	return &value
}

func (s *Store) CreateUser(ctx context.Context, u *model.User) error {
	_, err := s.db.ExecContext(ctx, `INSERT INTO users (`+userColumns+`)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		u.ID, u.Name, u.Email, u.Phone, u.APIKeyHash, u.EmergencyToken,
		u.CheckInIntervalMinutes, u.GraceMinutes, u.Timezone, u.LastCheckInAt,
		nil, nil, nil, u.CreatedAt, u.UpdatedAt,
	)
	return err
}

func (s *Store) UserByAPIKeyHash(ctx context.Context, hash string) (*model.User, error) {
	row := s.db.QueryRowContext(ctx, `SELECT `+userColumns+` FROM users WHERE api_key_hash = ?`, hash)
	return scanUser(row)
}

func (s *Store) UserByID(ctx context.Context, id string) (*model.User, error) {
	row := s.db.QueryRowContext(ctx, `SELECT `+userColumns+` FROM users WHERE id = ?`, id)
	return scanUser(row)
}

func (s *Store) UserByEmergencyToken(ctx context.Context, token string) (*model.User, error) {
	row := s.db.QueryRowContext(ctx, `SELECT `+userColumns+` FROM users WHERE emergency_token = ?`, token)
	return scanUser(row)
}

func (s *Store) UpdateUser(ctx context.Context, u *model.User) error {
	_, err := s.db.ExecContext(ctx, `UPDATE users SET
		name = ?, email = ?, phone = ?, check_in_interval_minutes = ?, grace_minutes = ?,
		timezone = ?, last_check_in_at = ?, warning_sent_for = ?, triggered_at = ?,
		trigger_reason = ?, updated_at = ?
		WHERE id = ?`,
		u.Name, u.Email, u.Phone, u.CheckInIntervalMinutes, u.GraceMinutes,
		u.Timezone, u.LastCheckInAt, u.WarningSentFor, u.TriggeredAt,
		u.TriggerReason, u.UpdatedAt, u.ID,
	)
	return err
}

func (s *Store) RotateEmergencyToken(ctx context.Context, userID, token, now string) error {
	_, err := s.db.ExecContext(ctx, `UPDATE users SET emergency_token = ?, updated_at = ? WHERE id = ?`, token, now, userID)
	return err
}

func (s *Store) DeleteUser(ctx context.Context, userID string) error {
	// D1 does not support transactions through the Go driver, so dependent
	// rows are removed explicitly in dependency order.
	for _, statement := range []string{
		`DELETE FROM notifications WHERE user_id = ?`,
		`DELETE FROM emergency_events WHERE user_id = ?`,
		`DELETE FROM sos_events WHERE user_id = ?`,
		`DELETE FROM locations WHERE user_id = ?`,
		`DELETE FROM check_ins WHERE user_id = ?`,
		`DELETE FROM contacts WHERE user_id = ?`,
		`DELETE FROM users WHERE id = ?`,
	} {
		if _, err := s.db.ExecContext(ctx, statement, userID); err != nil {
			return err
		}
	}
	return nil
}

func (s *Store) RecordCheckIn(ctx context.Context, userID, checkInID, note, now string) (int64, error) {
	if _, err := s.db.ExecContext(ctx, `INSERT INTO check_ins (id, user_id, note, created_at) VALUES (?, ?, ?, ?)`,
		checkInID, userID, note, now); err != nil {
		return 0, err
	}
	res, err := s.db.ExecContext(ctx, `UPDATE emergency_events SET resolved_at = ?
		WHERE user_id = ? AND resolved_at IS NULL`, now, userID)
	if err != nil {
		return 0, err
	}
	resolved, _ := res.RowsAffected()
	_, err = s.db.ExecContext(ctx, `UPDATE users SET last_check_in_at = ?, warning_sent_for = NULL,
		triggered_at = NULL, trigger_reason = NULL, updated_at = ? WHERE id = ?`, now, now, userID)
	return resolved, err
}

func (s *Store) ListCheckIns(ctx context.Context, userID string, limit int) ([]string, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT created_at FROM check_ins WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]string, 0, limit)
	for rows.Next() {
		var at string
		if err := rows.Scan(&at); err != nil {
			return nil, err
		}
		items = append(items, at)
	}
	return items, rows.Err()
}

// --- Contacts -------------------------------------------------------------------

const contactColumns = `id, user_id, name, email, phone, access_token, revoked_at, created_at, updated_at`

func scanContact(row interface{ Scan(...any) error }) (*model.Contact, error) {
	var (
		c       model.Contact
		email   sql.NullString
		phone   sql.NullString
		token   sql.NullString
		revoked sql.NullString
	)
	err := row.Scan(&c.ID, &c.UserID, &c.Name, &email, &phone, &token, &revoked, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, err
	}
	c.Email = nullStringPtr(email)
	c.Phone = nullStringPtr(phone)
	c.AccessToken = nullStringPtr(token)
	c.RevokedAt = nullStringPtr(revoked)
	return &c, nil
}

func (s *Store) CreateContact(ctx context.Context, c *model.Contact) error {
	_, err := s.db.ExecContext(ctx, `INSERT INTO contacts (`+contactColumns+`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		c.ID, c.UserID, c.Name, c.Email, c.Phone, c.AccessToken, nil, c.CreatedAt, c.UpdatedAt)
	return err
}

func (s *Store) ListContacts(ctx context.Context, userID string) ([]*model.Contact, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT `+contactColumns+` FROM contacts WHERE user_id = ? ORDER BY created_at ASC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]*model.Contact, 0)
	for rows.Next() {
		c, err := scanContact(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, c)
	}
	return items, rows.Err()
}

func (s *Store) ContactByID(ctx context.Context, userID, contactID string) (*model.Contact, error) {
	row := s.db.QueryRowContext(ctx, `SELECT `+contactColumns+` FROM contacts WHERE id = ? AND user_id = ?`, contactID, userID)
	return scanContact(row)
}

func (s *Store) ContactByAccessToken(ctx context.Context, token string) (*model.Contact, error) {
	row := s.db.QueryRowContext(ctx, `SELECT `+contactColumns+` FROM contacts WHERE access_token = ? AND revoked_at IS NULL`, token)
	return scanContact(row)
}

func (s *Store) UpdateContact(ctx context.Context, c *model.Contact) error {
	_, err := s.db.ExecContext(ctx, `UPDATE contacts SET name = ?, email = ?, phone = ?, access_token = ?,
		revoked_at = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
		c.Name, c.Email, c.Phone, c.AccessToken, c.RevokedAt, c.UpdatedAt, c.ID, c.UserID)
	return err
}

func (s *Store) DeleteContact(ctx context.Context, userID, contactID string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM contacts WHERE id = ? AND user_id = ?`, contactID, userID)
	return err
}

// --- Locations ------------------------------------------------------------------

func (s *Store) InsertLocation(ctx context.Context, l *model.Location) error {
	_, err := s.db.ExecContext(ctx, `INSERT INTO locations
		(id, user_id, latitude, longitude, accuracy_m, recorded_at, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		l.ID, l.UserID, l.Latitude, l.Longitude, l.AccuracyM, l.RecordedAt, l.CreatedAt)
	return err
}

func (s *Store) ListLocations(ctx context.Context, userID, since string, limit int) ([]*model.Location, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, user_id, latitude, longitude, accuracy_m, recorded_at, created_at
		FROM locations WHERE user_id = ? AND recorded_at >= ? ORDER BY recorded_at DESC LIMIT ?`,
		userID, since, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]*model.Location, 0, limit)
	for rows.Next() {
		var (
			l        model.Location
			accuracy sql.NullFloat64
		)
		if err := rows.Scan(&l.ID, &l.UserID, &l.Latitude, &l.Longitude, &accuracy, &l.RecordedAt, &l.CreatedAt); err != nil {
			return nil, err
		}
		l.AccuracyM = nullFloatPtr(accuracy)
		items = append(items, &l)
	}
	return items, rows.Err()
}

// --- SOS ------------------------------------------------------------------------

func (s *Store) CreateSOS(ctx context.Context, e *model.SOS) error {
	_, err := s.db.ExecContext(ctx, `INSERT INTO sos_events
		(id, user_id, kind, message, object_key, content_type, size_bytes, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		e.ID, e.UserID, e.Kind, e.Message, e.ObjectKey, e.ContentType, e.SizeBytes, e.CreatedAt)
	return err
}

func (s *Store) ListSOS(ctx context.Context, userID string, limit int) ([]*model.SOS, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, user_id, kind, message, object_key, content_type, size_bytes, created_at
		FROM sos_events WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]*model.SOS, 0)
	for rows.Next() {
		var (
			e       model.SOS
			message sql.NullString
			key     sql.NullString
			ctype   sql.NullString
			size    sql.NullInt64
		)
		if err := rows.Scan(&e.ID, &e.UserID, &e.Kind, &message, &key, &ctype, &size, &e.CreatedAt); err != nil {
			return nil, err
		}
		e.Message = nullStringPtr(message)
		e.ObjectKey = nullStringPtr(key)
		e.ContentType = nullStringPtr(ctype)
		e.SizeBytes = nullInt64Ptr(size)
		items = append(items, &e)
	}
	return items, rows.Err()
}

func (s *Store) SOSByID(ctx context.Context, userID, sosID string) (*model.SOS, error) {
	var (
		e       model.SOS
		message sql.NullString
		key     sql.NullString
		ctype   sql.NullString
		size    sql.NullInt64
	)
	err := s.db.QueryRowContext(ctx, `SELECT id, user_id, kind, message, object_key, content_type, size_bytes, created_at
		FROM sos_events WHERE id = ? AND user_id = ?`, sosID, userID).
		Scan(&e.ID, &e.UserID, &e.Kind, &message, &key, &ctype, &size, &e.CreatedAt)
	if err != nil {
		return nil, err
	}
	e.Message = nullStringPtr(message)
	e.ObjectKey = nullStringPtr(key)
	e.ContentType = nullStringPtr(ctype)
	e.SizeBytes = nullInt64Ptr(size)
	return &e, nil
}

// --- Emergency events -----------------------------------------------------------

const eventColumns = `id, user_id, reason, created_at, resolved_at, first_notified_at`

func scanEvent(row interface{ Scan(...any) error }) (*model.EmergencyEvent, error) {
	var (
		e             model.EmergencyEvent
		resolved      sql.NullString
		firstNotified sql.NullString
	)
	err := row.Scan(&e.ID, &e.UserID, &e.Reason, &e.CreatedAt, &resolved, &firstNotified)
	if err != nil {
		return nil, err
	}
	e.ResolvedAt = nullStringPtr(resolved)
	e.FirstNotifiedAt = nullStringPtr(firstNotified)
	return &e, nil
}

func (s *Store) ActiveEvent(ctx context.Context, userID string) (*model.EmergencyEvent, error) {
	row := s.db.QueryRowContext(ctx, `SELECT `+eventColumns+` FROM emergency_events
		WHERE user_id = ? AND resolved_at IS NULL ORDER BY created_at DESC LIMIT 1`, userID)
	return scanEvent(row)
}

// Trigger starts an emergency if one is not already active and marks the user
// as triggered. Repeated SOS calls reuse the active event.
func (s *Store) Trigger(ctx context.Context, userID, reason, now string) (*model.EmergencyEvent, bool, error) {
	existing, err := s.ActiveEvent(ctx, userID)
	if err == nil && existing != nil {
		if _, err := s.db.ExecContext(ctx, `UPDATE users SET triggered_at = ?, trigger_reason = ?,
			warning_sent_for = NULL, updated_at = ? WHERE id = ?`, now, reason, now, userID); err != nil {
			return nil, false, err
		}
		return existing, false, nil
	}
	if err != nil && err != sql.ErrNoRows {
		return nil, false, err
	}
	event := &model.EmergencyEvent{ID: id.New(), UserID: userID, Reason: reason, CreatedAt: now}
	if _, err := s.db.ExecContext(ctx, `INSERT INTO emergency_events (id, user_id, reason, created_at) VALUES (?, ?, ?, ?)`,
		event.ID, userID, reason, now); err != nil {
		return nil, false, err
	}
	if _, err := s.db.ExecContext(ctx, `UPDATE users SET triggered_at = ?, trigger_reason = ?,
		warning_sent_for = NULL, updated_at = ? WHERE id = ?`, now, reason, now, userID); err != nil {
		return nil, false, err
	}
	return event, true, nil
}
