# Functions and Routes List

## API Routes (all endpoints)
### From api/api/routes.py (mounted at /api/v1)
- POST /api/v1/auth/register (register)
- POST /api/v1/auth/login (login)
- POST /api/v1/auth/refresh (refresh)
- POST /api/v1/auth/logout (logout) - 204
- GET /api/v1/me (get_me)
- PATCH /api/v1/me (update_me)
- DELETE /api/v1/me (delete_me)
- POST /api/v1/check-ins (create_check_in) - 201/200
- GET /api/v1/check-ins/latest (get_latest_check_in)
- GET /api/v1/check-ins/status (get_check_in_status)
- GET /api/v1/contacts (list_contacts)
- POST /api/v1/contacts (add_contact) - 201
- POST /api/v1/contacts/test-message (test_contact_message)
- GET /api/v1/contacts/{contact_id} (get_contact)
- PUT /api/v1/contacts/{contact_id} (update_contact)
- DELETE /api/v1/contacts/{contact_id} (delete_contact) - 204
- POST /api/v1/locations (upload_locations) - 201
- GET /api/v1/locations/last (last_location)
- GET /api/v1/switch/status (switch_status)
- GET /api/v1/switch/deadline (switch_deadline)
- GET /api/v1/switch/events/latest (latest_event)

### From api/api/public.py (mounted at root)
- GET /e/{token} (emergency_page) - HTML
- GET /api/v1/emergency/{token} (emergency_data) - JSON

### From api/api/app.py
- GET /health

## Core Functions by Module

### api/accounts.py
- register(connection, name, interval_minutes, timezone, now, settings) -> Registration
- login(connection, user_id, account_key, now, settings) -> TokenPair
- refresh(connection, refresh_token, now, settings) -> TokenPair
- logout(connection, access_token) -> None
- authenticate(connection, access_token, now) -> str (user_id)
- _new_tokens, _insert_session

### api/profiles.py
- get_profile, update_profile, archive_profile, switch_status, validate_name

### api/checkins.py
- record_check_in, latest_check_in, update_device_state

### api/contacts.py
- validate_contact, normalize_email, normalize_phone, list_contacts, get_contact, add_contact, update_contact, delete_contact

### api/locations.py
- save_points, upload_points, get_last_known, clamp_recorded_at

### api/engine.py
- find_expired_users, trigger_user, process_expired, attach_address, latest_event_status, channels_for_contact

### api/worker.py
- run_once, main

### api/retention.py
- cleanup_links, cleanup_locations, cleanup_notification_events, purge_archived_profiles, run_cleanup

### api/links.py
- create_link_for_event, resolve_link

### api/security.py
- new_id, new_secret, new_link_token, hash_secret, secrets_match

### api/switch.py
- validate_interval_minutes, days_to_minutes, compute_deadline, is_expired, seconds_remaining

### api/timeutil.py
- utc_now, ensure_utc, to_db, from_db, resolve_zone, format_human

### api/config.py
- Settings, load_env_file, env_file_path
