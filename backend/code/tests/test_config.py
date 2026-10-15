from __future__ import annotations

import pytest

from deadman import config
from deadman.config import Settings, env_file_path, load_env_file

ENV_BODY = """
# A comment, and a blank line above it.

DEADMAN_DB_PATH=travel.db
export DEADMAN_CORS_ORIGINS=*
RESEND_FROM_EMAIL="Deadman Switch <alerts@example.com>"
WHATSAPP_BOT_URL=http://127.0.0.1:8001
WHATSAPP_BOT_TOKEN=  spaced-out
# WHATSAPP_BOT_TOKEN=commented-out
not a valid line at all
"""


@pytest.fixture
def env_file(tmp_path, monkeypatch):
    """Point the loader at a temporary .env, with os.environ restored afterwards."""
    path = tmp_path / ".env"
    path.write_text(ENV_BODY, encoding="utf-8")
    monkeypatch.setattr(config, "env_file_path", lambda: path)
    for key in ("DEADMAN_DB_PATH", "DEADMAN_CORS_ORIGINS", "RESEND_FROM_EMAIL", "WHATSAPP_BOT_URL", "WHATSAPP_BOT_TOKEN"):
        monkeypatch.delenv(key, raising=False)
    return path


def test_env_file_lives_next_to_the_package_not_the_working_directory():
    # Anchored to the package so the API and the worker agree regardless of cwd.
    assert env_file_path().name == ".env"
    assert env_file_path().parent.name == "code"


def test_load_env_file_reads_keys_comments_and_quotes(env_file):
    assert load_env_file() == 5
    assert config.os.environ["DEADMAN_DB_PATH"] == "travel.db"
    # `export` prefix, and a bare `*` that must not be treated as a glob.
    assert config.os.environ["DEADMAN_CORS_ORIGINS"] == "*"
    # Quotes come off, and the spaces and angle brackets inside them are kept.
    assert config.os.environ["RESEND_FROM_EMAIL"] == "Deadman Switch <alerts@example.com>"
    assert config.os.environ["WHATSAPP_BOT_URL"] == "http://127.0.0.1:8001"
    # Surrounding whitespace is trimmed, and the commented-out line below the real one
    # must not win.
    assert config.os.environ["WHATSAPP_BOT_TOKEN"] == "spaced-out"


def test_load_env_file_never_overrides_a_real_environment_variable(env_file, monkeypatch):
    # A deploy that injects its own config must keep it: an inherited variable is a
    # deliberate choice, and a stale .env must not win over it.
    monkeypatch.setenv("WHATSAPP_BOT_URL", "http://gateway.internal:9000")
    load_env_file()
    assert config.os.environ["WHATSAPP_BOT_URL"] == "http://gateway.internal:9000"


def test_a_missing_env_file_is_not_an_error(monkeypatch, tmp_path):
    monkeypatch.setattr(config, "env_file_path", lambda: tmp_path / "absent.env")
    assert load_env_file() == 0


def test_from_env_without_arguments_loads_the_file(env_file):
    # The regression this guards: with no env exported, WHATSAPP_BOT_URL came back empty
    # and every test alert 503'd as though the gateway were broken.
    assert Settings.from_env().whatsapp_bot_url == "http://127.0.0.1:8001"


def test_from_env_with_an_explicit_mapping_ignores_the_file(env_file):
    # Tests and callers with deliberate settings must not have the real .env bleed in.
    settings = Settings.from_env({"WHATSAPP_BOT_URL": "http://elsewhere"})
    assert settings.whatsapp_bot_url == "http://elsewhere"
    assert "WHATSAPP_BOT_URL" not in config.os.environ
