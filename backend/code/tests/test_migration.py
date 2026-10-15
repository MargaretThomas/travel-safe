from deadman.db import MIGRATIONS, migrate, open_connection

NOW = "2026-01-10T09:00:00+00:00"


def _old_schema_db(tmp_path):
    """A database at version 1 (the schema before SMS was removed), with data."""
    connection = open_connection(str(tmp_path / "old.db"))
    connection.executescript(f"BEGIN;\n{MIGRATIONS[0]}\nPRAGMA user_version = 1;\nCOMMIT;")

    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute(
        """
        INSERT INTO users (id, name, timezone, account_key_hash, check_in_interval_days,
                           switch_state, created_at, updated_at)
        VALUES ('u1', 'Thandi', NULL, 'hash', 1, 'triggered', ?, ?)
        """,
        (NOW, NOW),
    )
    connection.execute(
        """
        INSERT INTO deadman_events (id, user_id, deadline_at, triggered_at, status, location_purge_after)
        VALUES ('e1', 'u1', ?, ?, 'triggered', ?)
        """,
        (NOW, NOW, "2026-02-10T09:00:00+00:00"),
    )
    connection.execute(
        """
        INSERT INTO emergency_contacts (id, user_id, name, email, phone, whatsapp, created_at, updated_at)
        VALUES ('c1', 'u1', 'Sipho', 'sipho@example.com', NULL, 0, ?, ?),
               ('c2', 'u1', 'Nomsa', NULL, '+27821234567', 0, ?, ?)
        """,
        (NOW, NOW, NOW, NOW),
    )

    def _notification(notification_id: str, contact_id: str, channel: str, recipient: str) -> None:
        connection.execute(
            """
            INSERT INTO notification_events (id, deadman_event_id, contact_id, notification_type, channel,
                                             recipient, recipient_name, status, retryable, attempts,
                                             created_at, updated_at)
            VALUES (?, 'e1', ?, 'emergency_alert', ?, ?, ?, 'sent', 1, 1, ?, ?)
            """,
            (notification_id, contact_id, channel, recipient, "Sipho", NOW, NOW),
        )

    _notification("n1", "c1", "email", "sipho@example.com")
    _notification("n2", "c2", "sms", "+27821234567")

    connection.execute(
        """
        INSERT INTO emergency_links (id, deadman_event_id, notification_event_id, token_hash, created_at, expires_at)
        VALUES ('l1', 'e1', 'n1', 'tok-email', ?, ?), ('l2', 'e1', 'n2', 'tok-sms', ?, ?)
        """,
        (NOW, NOW, NOW, NOW),
    )
    return connection


def test_migration_removes_sms_channel_and_detaches_its_links(tmp_path):
    connection = _old_schema_db(tmp_path)
    try:
        migrate(connection)
        channels = [row["channel"] for row in connection.execute("SELECT channel FROM notification_events")]
        assert channels == ["email"]
        links = connection.execute(
            "SELECT notification_event_id FROM emergency_links WHERE id = 'l2'"
        ).fetchone()
        assert links["notification_event_id"] is None
        kept = connection.execute(
            "SELECT notification_event_id FROM emergency_links WHERE id = 'l1'"
        ).fetchone()
        assert kept["notification_event_id"] == "n1"
        assert connection.execute("PRAGMA foreign_key_check").fetchall() == []
        assert connection.execute("PRAGMA user_version").fetchone()[0] == len(MIGRATIONS)
    finally:
        connection.close()


def test_sms_is_rejected_after_migration(tmp_path):
    connection = _old_schema_db(tmp_path)
    try:
        migrate(connection)
        connection.execute("BEGIN")
        try:
            connection.execute(
                """
                INSERT INTO notification_events (id, deadman_event_id, contact_id, notification_type, channel,
                                                 recipient, recipient_name, status, retryable, attempts,
                                                 created_at, updated_at)
                VALUES ('n3', 'e1', 'c2', 'emergency_alert', 'sms', '+27821234567', 'Nomsa',
                        'pending', 1, 0, ?, ?)
                """,
                (NOW, NOW),
            )
        finally:
            connection.execute("ROLLBACK")
        raise AssertionError("expected the sms channel to be rejected by the new CHECK constraint")
    except Exception as error:
        assert "CHECK constraint failed" in str(error)
    finally:
        connection.close()


CHILD_TABLES = [
    "auth_sessions",
    "emergency_contacts",
    "check_ins",
    "last_known_locations",
    "deadman_events",
    "locations",
    "notification_events",
    "emergency_links",
    "archived_profiles",
]


def _version_2_db(tmp_path, interval_days: int = 7):
    """A database on the day-based schema, with a row in every table that references users."""
    connection = open_connection(str(tmp_path / "days.db"))
    connection.executescript(f"BEGIN;\n{MIGRATIONS[0]}\nPRAGMA user_version = 1;\nCOMMIT;")
    connection.executescript(f"BEGIN;\n{MIGRATIONS[1]}\nPRAGMA user_version = 2;\nCOMMIT;")

    connection.execute(
        """
        INSERT INTO users (id, name, timezone, account_key_hash, check_in_interval_days,
                           switch_state, created_at, updated_at)
        VALUES ('u1', 'Thandi', 'Africa/Johannesburg', 'hash', ?, 'armed', ?, ?)
        """,
        (interval_days, NOW, NOW),
    )
    connection.execute(
        """
        INSERT INTO auth_sessions (id, user_id, access_token_hash, refresh_token_hash,
                                   access_expires_at, refresh_expires_at, created_at, updated_at)
        VALUES ('s1', 'u1', 'a', 'r', ?, ?, ?, ?)
        """,
        (NOW, NOW, NOW, NOW),
    )
    connection.execute(
        """
        INSERT INTO emergency_contacts (id, user_id, name, email, phone, whatsapp, created_at, updated_at)
        VALUES ('c1', 'u1', 'Sipho', 'sipho@example.com', NULL, 0, ?, ?)
        """,
        (NOW, NOW),
    )
    connection.execute(
        """
        INSERT INTO check_ins (id, user_id, client_id, occurred_at, received_at, deadline_at, source)
        VALUES ('ci1', 'u1', 'c-1', ?, ?, ?, 'app')
        """,
        (NOW, NOW, NOW),
    )
    connection.execute(
        """
        INSERT INTO last_known_locations (user_id, latitude, longitude, accuracy_m, recorded_at, received_at)
        VALUES ('u1', -33.9, 18.4, 10, ?, ?)
        """,
        (NOW, NOW),
    )
    connection.execute(
        """
        INSERT INTO deadman_events (id, user_id, deadline_at, triggered_at, status, location_purge_after)
        VALUES ('e1', 'u1', ?, ?, 'triggered', ?)
        """,
        (NOW, NOW, NOW),
    )
    connection.execute(
        """
        INSERT INTO locations (id, user_id, latitude, longitude, recorded_at, received_at, source, deadman_event_id)
        VALUES ('loc1', 'u1', -33.9, 18.4, ?, ?, 'check_in', 'e1')
        """,
        (NOW, NOW),
    )
    connection.execute(
        """
        INSERT INTO notification_events (id, deadman_event_id, contact_id, channel, recipient, recipient_name,
                                         status, created_at, updated_at)
        VALUES ('n1', 'e1', 'c1', 'email', 'sipho@example.com', 'Sipho', 'sent', ?, ?)
        """,
        (NOW, NOW),
    )
    connection.execute(
        """
        INSERT INTO emergency_links (id, deadman_event_id, notification_event_id, token_hash, created_at, expires_at)
        VALUES ('l1', 'e1', 'n1', 'tok', ?, ?)
        """,
        (NOW, NOW),
    )
    connection.execute("INSERT INTO archived_profiles (user_id, archived_at, purge_after) VALUES ('u1', ?, ?)", (NOW, NOW))
    return connection


def test_day_intervals_become_minutes(tmp_path):
    connection = _version_2_db(tmp_path, interval_days=7)
    try:
        migrate(connection)
        user = connection.execute("SELECT * FROM users WHERE id = 'u1'").fetchone()
        assert user["check_in_interval_minutes"] == 7 * 1440
        assert user["name"] == "Thandi"
        assert user["timezone"] == "Africa/Johannesburg"
        assert user["switch_state"] == "armed"
        assert connection.execute("PRAGMA user_version").fetchone()[0] == len(MIGRATIONS)
    finally:
        connection.close()


def test_rebuilding_users_keeps_every_referencing_row(tmp_path):
    """Dropping and recreating a parent table must not cascade into the tables below it."""
    connection = _version_2_db(tmp_path)
    try:
        before = {table: connection.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0] for table in CHILD_TABLES}
        assert all(count == 1 for count in before.values())

        migrate(connection)

        after = {table: connection.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0] for table in CHILD_TABLES}
        assert after == before
        assert connection.execute("PRAGMA foreign_key_check").fetchall() == []
        assert connection.execute("PRAGMA foreign_keys").fetchone()[0] == 1
    finally:
        connection.close()


def test_the_deadline_index_survives_the_rebuild(tmp_path):
    """The worker scans users by (switch_state, next_deadline_at), so losing the index would
    turn every pass into a full table scan; assert it is still there instead of trusting the DDL."""
    connection = _version_2_db(tmp_path)
    try:
        migrate(connection)
        indexes = {
            row["name"]
            for row in connection.execute("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'users'")
        }
        assert "idx_users_state_deadline" in indexes
    finally:
        connection.close()


def test_sub_day_intervals_are_rejected_after_migration(tmp_path):
    connection = _version_2_db(tmp_path)
    try:
        migrate(connection)
        connection.execute("BEGIN")
        try:
            connection.execute("UPDATE users SET check_in_interval_minutes = 30 WHERE id = 'u1'")
        finally:
            connection.execute("ROLLBACK")
        raise AssertionError("expected a 30 minute interval to be rejected by the new CHECK constraint")
    except Exception as error:
        assert "CHECK constraint failed" in str(error)
    finally:
        connection.close()