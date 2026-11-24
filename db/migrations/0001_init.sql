-- Travel Safe schema. Shared by the Go API and the hourly notification worker.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id                        TEXT PRIMARY KEY,
  name                      TEXT NOT NULL,
  email                     TEXT,
  phone                     TEXT,
  api_key_hash              TEXT NOT NULL UNIQUE,
  emergency_token           TEXT NOT NULL UNIQUE,
  check_in_interval_minutes INTEGER,
  grace_minutes             INTEGER NOT NULL DEFAULT 60,
  timezone                  TEXT,
  last_check_in_at          TEXT NOT NULL,
  warning_sent_for          TEXT,
  triggered_at              TEXT,
  trigger_reason            TEXT,
  created_at                TEXT NOT NULL,
  updated_at                TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS users_deadman_idx
  ON users (triggered_at, check_in_interval_minutes, last_check_in_at);

CREATE TABLE IF NOT EXISTS contacts (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  email         TEXT,
  phone         TEXT,
  access_token  TEXT UNIQUE,
  revoked_at    TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS contacts_user_idx ON contacts (user_id, created_at);

CREATE TABLE IF NOT EXISTS locations (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  latitude    REAL NOT NULL,
  longitude   REAL NOT NULL,
  accuracy_m  REAL,
  recorded_at TEXT NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS locations_user_time_idx
  ON locations (user_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS check_ins (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note       TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS check_ins_user_time_idx
  ON check_ins (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS sos_events (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL CHECK (kind IN ('video', 'image', 'audio', 'message')),
  message      TEXT,
  object_key   TEXT,
  content_type TEXT,
  size_bytes   INTEGER,
  created_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS sos_user_time_idx ON sos_events (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS emergency_events (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason           TEXT NOT NULL CHECK (reason IN ('deadman', 'sos')),
  created_at       TEXT NOT NULL,
  resolved_at      TEXT,
  first_notified_at TEXT
);

CREATE INDEX IF NOT EXISTS emergency_active_idx
  ON emergency_events (resolved_at, first_notified_at);

CREATE INDEX IF NOT EXISTS emergency_user_idx
  ON emergency_events (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_id TEXT NOT NULL DEFAULT '',
  kind       TEXT NOT NULL,
  cycle_key  TEXT NOT NULL,
  recipient  TEXT,
  status     TEXT NOT NULL,
  error      TEXT,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS notifications_unique_idx
  ON notifications (user_id, contact_id, kind, cycle_key);
