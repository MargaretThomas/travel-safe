#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CODE="$ROOT/code"
VENV="$CODE/.venv"

usage() {
  cat <<'EOF'
Usage: scripts/app.sh <setup|test|build|run|pm2>

  setup  Create a Python 3.12 venv and install requirements
  test   Run ruff and pytest
  build  Install requirements and compile sources
  run    Start uvicorn with reload on 0.0.0.0:8000
  pm2    Start (or restart) the API with pm2
EOF
}

python_bin() {
  if command -v python3.12 >/dev/null 2>&1; then
    echo python3.12
  else
    echo python3
  fi
}

ensure_venv() {
  if [[ ! -x "$VENV/bin/python" ]]; then
    "$(python_bin)" -m venv "$VENV"
  fi
}

install_deps() {
  ensure_venv
  "$VENV/bin/python" -m pip install --upgrade pip
  "$VENV/bin/python" -m pip install -r "$CODE/requirements.txt"
}

cmd="${1:-}"
case "$cmd" in
  setup)
    install_deps
    ;;
  test)
    if [[ ! -x "$VENV/bin/python" ]]; then
      install_deps
    fi
    cd "$CODE"
    "$VENV/bin/ruff" check .
    "$VENV/bin/pytest" -v
    ;;
  build)
    install_deps
    cd "$CODE"
    "$VENV/bin/python" -m compileall src
    ;;
  run)
    if [[ ! -x "$VENV/bin/python" ]]; then
      install_deps
    fi
    cd "$CODE"
    exec "$VENV/bin/uvicorn" src.main:app --reload --host 0.0.0.0 --port 8000
    ;;
  pm2)
    if [[ ! -x "$VENV/bin/python" ]]; then
      install_deps
    fi
    if ! command -v pm2 >/dev/null 2>&1; then
      echo "pm2 is not installed. Install it with: npm install -g pm2" >&2
      exit 1
    fi
    cd "$CODE"
    if pm2 describe travel-safe-api >/dev/null 2>&1; then
      pm2 restart ecosystem.config.cjs
    else
      pm2 start ecosystem.config.cjs
    fi
    ;;
  *)
    usage
    exit 1
    ;;
esac
