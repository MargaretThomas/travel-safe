# Unit Tests List (Python pytest)

Tests are in backend/code/tests/ (132 tests total collected across multiple files):

- tests/test_accounts.py - 8 tests
  1. test_register_stores_only_hashes
  2. test_authenticate_accepts_valid_access_token
  3. test_expired_access_token_is_rejected
  4. test_unknown_token_is_rejected
  5. test_refresh_rotates_tokens_and_old_refresh_token_stops_working
  6. test_login_with_account_key_issues_new_session
  7. test_login_with_wrong_key_fails
  8. test_logout_revokes_session

- tests/test_api.py - 58 tests (API endpoint tests)
- tests/test_checkins.py - 17 tests
- tests/test_config.py - 6 tests
- tests/test_contacts.py - 27 tests
- tests/test_dispatcher.py - 7 tests
- tests/test_emergency_page.py - 6 tests
- tests/test_engine.py - 10 tests
- tests/test_messages.py - 6 tests
- tests/test_migration.py - 6 tests
- tests/test_providers.py - 16 tests
- tests/test_retention.py - 8 tests
- tests/test_switch.py - 33 tests
- tests/test_worker.py - 2 tests

Total: ~208 tests as counted by collection? Let us look up exact counts again.

**Total: 210 unit tests**
