#!/usr/bin/env bash
#
# Dev driver for the two backend services.
#
#   code/       FastAPI app + deadman worker (Python)
#   whatsapp/   WhatsApp gateway that the app POSTs /send to (Go)
#
# The two are coupled by one shared secret, so the commands below keep it in step
# rather than leaving a mismatched token to surface later as a 401 on every send.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CODE="$ROOT/code"
WA="$ROOT/whatsapp"
VENV="$CODE/.venv"
GATEWAY_BIN="$WA/main"

API_HOST="${API_HOST:-0.0.0.0}"   # 0.0.0.0 so a phone on the LAN can reach the app
API_PORT="${API_PORT:-8000}"

# How long `run` waits for the QR to be scanned before carrying on unpaired, and how
# many times to restart the gateway when WhatsApp's codes run out. WAIT_SECONDS is
# also the escape hatch for non-interactive runs, so remember whether it was given.
if [[ -n ${WAIT_SECONDS:-} ]]; then
  WAIT_SECONDS_EXPLICIT=1
else
  WAIT_SECONDS=300
  WAIT_SECONDS_EXPLICIT=0
fi
PAIR_RESTARTS="${PAIR_RESTARTS:-3}"

# Set by --no-wait.
WAIT_FOR_PAIRING=1

# Tracks the mtime of the QR we last pointed the user at, so a rotated code is
# announced again instead of leaving a stale image on screen.
QR_STAMP=""

# TMPDIR usually ends in a slash on macOS, so trim it before joining.
LOGS="${TMPDIR:-/tmp}"; LOGS="${LOGS%/}/travel-safe-logs"

log()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33mwarning:\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31merror:\033[0m %s\n' "$*" >&2; exit 1; }

usage() {
  cat <<'EOF'
Usage: scripts/dev.sh [options] <command>

  setup   Create the venv, install both toolchains, create .env files and sync the
          shared WhatsApp token
  test    ruff + pytest (code), gofmt + go vet (whatsapp)
  build   Compile Python sources and the Go gateway
  run     Start the gateway, wait for the QR scan, then start the API and the
          deadman worker; Ctrl-C stops all three
  doctor  Check the wiring between the two services without sending anything
  token   Regenerate the shared WhatsApp token in both .env files
  pair    Re-pair the gateway from a fresh QR code (deletes the stored session)

Options:
  --no-wait   With `run`, skip waiting for the QR scan and start straight away.

Environment overrides:
  API_HOST, API_PORT   where the API listens (default 0.0.0.0:8000)
  WAIT_SECONDS         how long `run` waits for pairing (default 300). Set it to 0
                       to never wait. Setting it also re-enables the wait in a
                       non-interactive run, which is otherwise skipped so that CI
                       and deploys cannot hang.
  PAIR_RESTARTS        how many times `run` restarts the gateway when WhatsApp's QR
                       codes run out (default 3)
EOF
}

# --- small helpers -------------------------------------------------------------------

# BSD mktemp requires a template, and sed -i differs between macOS and GNU. Both
# helpers below are written to avoid either.
tmpfile() { mktemp "${TMPDIR:-/tmp}/travel-safe.XXXXXX"; }

python_bin() {
  if command -v python3.12 >/dev/null 2>&1; then echo python3.12; else echo python3; fi
}

# Read a KEY from a .env file. Never evals the file: an unquoted value containing
# < or > would otherwise be a shell parse error, or worse, a redirection.
env_get() {
  local file=$1 key=$2 line value
  [[ -f $file ]] || return 0
  while IFS= read -r line || [[ -n $line ]]; do
    [[ $line =~ ^[[:space:]]*$ || $line =~ ^[[:space:]]*# ]] && continue
    if [[ $line =~ ^[[:space:]]*(export[[:space:]]+)?${key}[[:space:]]*=(.*)$ ]]; then
      value=${BASH_REMATCH[2]}
      value=${value%"${value##*[![:space:]]}"}
      if [[ ${#value} -ge 2 && ${value:0:1} == '"' && ${value: -1} == '"' ]]; then
        value=${value:1:${#value}-2}
      elif [[ ${#value} -ge 2 && ${value:0:1} == "'" && ${value: -1} == "'" ]]; then
        value=${value:1:${#value}-2}
      fi
      printf '%s' "$value"
      return 0
    fi
  done < "$file"
}

# Set KEY=VALUE in a .env file, replacing in place or appending.
env_set() {
  local file=$1 key=$2 value=$3 tmp line found=0
  [[ -f $file ]] || : > "$file"
  tmp=$(tmpfile)
  while IFS= read -r line || [[ -n $line ]]; do
    if [[ $line =~ ^[[:space:]]*(export[[:space:]]+)?${key}[[:space:]]*= ]]; then
      printf '%s=%s\n' "$key" "$value" >> "$tmp"
      found=1
    else
      printf '%s\n' "$line" >> "$tmp"
    fi
  done < "$file"
  [[ $found -eq 1 ]] || printf '%s=%s\n' "$key" "$value" >> "$tmp"
  cat "$tmp" > "$file"
  rm -f "$tmp"
}

# Export every KEY=VALUE in a .env file into the environment, parsing rather than
# sourcing so that no value is ever treated as shell syntax.
export_env() {
  local file=$1 line key value
  [[ -f $file ]] || return 0
  while IFS= read -r line || [[ -n $line ]]; do
    [[ $line =~ ^[[:space:]]*$ || $line =~ ^[[:space:]]*# ]] && continue
    [[ $line =~ ^[[:space:]]*(export[[:space:]]+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]] || continue
    key=${BASH_REMATCH[2]}
    value=${BASH_REMATCH[3]}
    value=${value%"${value##*[![:space:]]}"}
    if [[ ${#value} -ge 2 && ${value:0:1} == '"' && ${value: -1} == '"' ]]; then
      value=${value:1:${#value}-2}
    elif [[ ${#value} -ge 2 && ${value:0:1} == "'" && ${value: -1} == "'" ]]; then
      value=${value:1:${#value}-2}
    fi
    export "$key=$value"
  done < "$file"
}

bootstrap_env() { # dir -> copies .env.example to .env if missing
  local dir=$1
  [[ -f $dir/.env.example ]] || die "$dir/.env.example is missing"
  if [[ -f $dir/.env ]]; then
    return 0
  fi
  cp "$dir/.env.example" "$dir/.env"
  chmod 600 "$dir/.env"
  log "created $dir/.env from .env.example"
}

# The API's .env is the source of truth for the token; the gateway is told to match.
# A mismatch is always a bug, so this converges rather than warning and stopping.
sync_token() {
  local code_token wa_token generated=""
  code_token=$(env_get "$CODE/.env" WHATSAPP_BOT_TOKEN)
  wa_token=$(env_get "$WA/.env" WHATSAPP_BOT_TOKEN)

  if [[ -z $code_token && -z $wa_token ]]; then
    generated=$(openssl rand -hex 32)
    env_set "$CODE/.env" WHATSAPP_BOT_TOKEN "$generated"
    env_set "$WA/.env" WHATSAPP_BOT_TOKEN "$generated"
    log "generated a new shared WhatsApp token in both .env files"
  elif [[ -z $code_token ]]; then
    env_set "$CODE/.env" WHATSAPP_BOT_TOKEN "$wa_token"
    log "copied the gateway's token into code/.env"
  elif [[ $code_token != "$wa_token" ]]; then
    env_set "$WA/.env" WHATSAPP_BOT_TOKEN "$code_token"
    warn "the gateway token did not match the API's and has been overwritten."
    warn "restart the gateway (dev.sh run) or every send will be rejected with 401."
  fi
}

# Derive the API's gateway URL from the gateway's own bind address, so the port can
# only be changed in one place.
sync_url() {
  local host port url
  host=$(env_get "$WA/.env" HOST); host=${host:-127.0.0.1}
  port=$(env_get "$WA/.env" PORT); port=${port:-8080}
  url="http://$host:$port"
  if [[ $(env_get "$CODE/.env" WHATSAPP_BOT_URL) != "$url" ]]; then
    env_set "$CODE/.env" WHATSAPP_BOT_URL "$url"
    log "set WHATSAPP_BOT_URL=$url in code/.env"
  fi
  if [[ $host != 127.0.0.1 && $host != localhost && $host != ::1 ]]; then
    warn "the gateway binds $host, so it is reachable from the network."
    warn "it speaks plain HTTP; put a TLS proxy in front of it before trusting that."
  fi
}

ensure_venv() {
  [[ -x $VENV/bin/python ]] || { log "creating the Python venv"; "$(python_bin)" -m venv "$VENV"; }
}

ensure_deps() {
  ensure_venv
  command -v go >/dev/null 2>&1 || die "go is not installed (see https://go.dev/dl/)"
  command -v curl >/dev/null 2>&1 || die "curl is not installed"
}

gateway_url() {
  local host port
  host=$(env_get "$WA/.env" HOST); host=${host:-127.0.0.1}
  port=$(env_get "$WA/.env" PORT); port=${port:-8080}
  printf 'http://%s:%s' "$host" "$port"
}

# --- commands -----------------------------------------------------------------------

cmd_setup() {
  ensure_deps
  bootstrap_env "$CODE"
  bootstrap_env "$WA"
  log "installing Python dependencies"
  "$VENV/bin/python" -m pip install --quiet --upgrade pip
  "$VENV/bin/python" -m pip install --quiet -r "$CODE/requirements.txt"
  "$VENV/bin/python" -m pip install --quiet ruff pytest
  log "downloading Go modules"
  (cd "$WA" && go mod download)
  sync_token
  sync_url
  log "checking the toolchain"
  (cd "$CODE" && "$VENV/bin/python" -c 'import fastapi, httpx, pydantic')
  (cd "$WA" && go build -o /dev/null .)
  log "setup complete. Next: scripts/dev.sh run"
  if [[ ! -f $WA/store.db || ! -s $WA/qr.png ]]; then
    log "the gateway has never been paired: run 'scripts/dev.sh pair' or expect a QR on first run"
  fi
}

cmd_test() {
  ensure_venv
  log "code: ruff"
  (cd "$CODE" && "$VENV/bin/ruff" check .)
  log "code: pytest"
  (cd "$CODE" && "$VENV/bin/pytest")
  if command -v go >/dev/null 2>&1; then
    log "whatsapp: gofmt"
    local unformatted
    unformatted=$(cd "$WA" && gofmt -l .)
    [[ -z $unformatted ]] || die "not gofmt-clean:"$'\n'"$unformatted"
    log "whatsapp: go vet"
    (cd "$WA" && go vet ./...)
  else
    warn "go is not installed; skipped the whatsapp checks"
  fi
  log "all checks passed"
}

cmd_build() {
  ensure_deps
  log "code: compileall"
  (cd "$CODE" && "$VENV/bin/python" -m compileall -q deadman)
  log "whatsapp: go build"
  (cd "$WA" && go build -o main .)
  log "build complete"
}

wait_for_gateway() { # url
  local url=$1
  for _ in {1..50}; do
    if curl -fsS --max-time 1 "$url/health" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.2
  done
  return 1
}

# A gateway that reconnects to a stored session needs a second or two to log in after it
# answers /health, so a single check right after startup reports "not paired" for a session
# that is perfectly fine. Give it a moment before telling the operator to re-pair, which
# would unlink a working device.
settle_paired() { # url seconds
  local url=$1 seconds=$2 i
  for ((i = 0; i < seconds * 5; i++)); do
    gateway_is_paired "$url" && return 0
    sleep 0.2
  done
  return 1
}

# Whether the gateway reports a paired device. Whitespace is stripped before matching:
# comparing the raw JSON text would silently stop working if the gateway's encoder ever
# padded its output, and the symptom would be an unexplained five-minute wait followed by
# starting up unpaired.
gateway_is_paired() { # url
  local health
  health=$(curl -fsS --max-time 1 "$1/health" 2>/dev/null) || return 1
  health=${health//[[:space:]]/}
  [[ $health == *'"paired":true'* ]]
}

# Start the gateway, appending its pid to `pids` so cleanup and the crash-detecting
# supervisor both see it.
#
# stdout goes to a process substitution rather than a `| tee` pipeline on purpose: with a
# pipeline $! would be tee's pid, so a gateway that died would look alive and the API
# would sit there accepting check-ins it could never alert on. Here `exec` keeps $! as
# the gateway itself, and the same bytes reach the terminal (so the QR is scannable
# without opening a file) and the log.
start_gateway() {
  (cd "$WA" && exec ./main) > >(tee -a "$LOGS/gateway.log") 2>&1 &
  pids+=($!)
  names+=(gateway)
}

# Point the user at the QR whenever it changes: WhatsApp rotates it about once a
# minute, and re-announcing is the difference between "still waiting" and "your code
# expired, this is the new one".
announce_qr() {
  [[ -f $WA/qr.png ]] || return 0
  local stamp
  stamp=$(date -r "$WA/qr.png" +%s)
  [[ $stamp == "$QR_STAMP" ]] && return 0
  QR_STAMP=$stamp
  log "scan this with your phone: WhatsApp > Settings > Linked Devices > Link a Device"
  log "  $WA/qr.png"
  if command -v open >/dev/null 2>&1; then
    open "$WA/qr.png" >/dev/null 2>&1 || warn "  (could not open the image; use the path above)"
  fi
}

# Block until the gateway reports paired:true, restarting it if WhatsApp's codes run
# out. Returns 0 when paired, 1 when it gave up (the caller carries on regardless,
# because the API and worker are still useful unpaired).
wait_for_pairing() { # url
  local url=$1 deadline restarts=0

  # A CI job or a deploy has nobody standing at a QR scanner, and hanging on a prompt
  # nobody can answer is worse than starting unpaired. An explicit WAIT_SECONDS opts
  # back in, for a deploy that deliberately gives an operator a window to scan.
  if [[ ! -t 1 && $WAIT_SECONDS_EXPLICIT -eq 0 ]]; then
    log "not an interactive terminal; skipping the QR wait"
    return 1
  fi
  if [[ $WAIT_SECONDS -le 0 ]]; then
    return 1
  fi

  deadline=$(( $(date +%s) + WAIT_SECONDS ))
  while [[ $(date +%s) -lt $deadline ]]; do
    if gateway_is_paired "$url"; then
      log "paired"
      return 0
    fi
    announce_qr
    # An expired-code batch ends the channel, and the gateway exits rather than
    # looping, so a missed scan has to be recovered from rather than waited out.
    if ! kill -0 "${pids[0]}" 2>/dev/null; then
      if [[ $restarts -ge $PAIR_RESTARTS ]]; then
        warn "out of QR codes and out of retries; run 'scripts/dev.sh pair' for a fresh one"
        return 1
      fi
      restarts=$((restarts + 1))
      warn "WhatsApp's QR codes ran out; restarting the gateway (try $restarts/$PAIR_RESTARTS)"
      QR_STAMP=""
      pids=(); names=()
      start_gateway
      wait_for_gateway "$url" || warn "the restarted gateway is not answering; see $LOGS/gateway.log"
    fi
    sleep 1
  done
  return 1
}

cmd_run() {
  ensure_deps
  sync_token
  sync_url
  export_env "$CODE/.env"
  [[ -x $GATEWAY_BIN ]] || { log "gateway not built yet"; (cd "$WA" && go build -o main .); }
  mkdir -p "$LOGS"

  local url
  url=$(gateway_url)
  pids=(); names=()

  cleanup() {
    trap - INT TERM EXIT
    log "stopping"
    for pid in "${pids[@]}"; do kill "$pid" 2>/dev/null || true; done
    wait 2>/dev/null || true
  }
  trap cleanup INT TERM EXIT

  log "gateway  -> $LOGS/gateway.log"
  start_gateway
  if ! wait_for_gateway "$url"; then
    warn "the gateway did not answer on $url; see $LOGS/gateway.log"
  fi

  # Pairing gates the API and the worker, not the gateway: the gateway has to be up to
  # emit a QR in the first place, and holding it back would deadlock the wait.
  if (( WAIT_FOR_PAIRING )); then
    if wait_for_pairing "$url"; then
      log "gateway is paired and connected"
    else
      warn "continuing without pairing: every alert will fail with whatsapp_not_connected."
      warn "scan $WA/qr.png (or run 'scripts/dev.sh pair') and the next worker pass will deliver."
    fi
  elif ! settle_paired "$url" 5; then
    if [[ -f $WA/qr.png ]]; then
      warn "not paired yet: open $WA/qr.png and scan it, or run 'scripts/dev.sh pair'."
    else
      warn "not paired and there is no QR to scan: run 'scripts/dev.sh pair' to re-pair this device."
    fi
  fi

  log "api      -> http://$API_HOST:$API_PORT (logs: $LOGS/api.log)"
  (cd "$CODE" && exec "$VENV/bin/uvicorn" app:app --reload --host "$API_HOST" --port "$API_PORT") \
    > "$LOGS/api.log" 2>&1 &
  pids+=($!); names+=(api)

  # Without the worker nothing is ever alerted: the API only records check-ins, and
  # it is the worker that notices a missed one and dispatches the messages.
  log "worker   -> $LOGS/worker.log"
  (cd "$CODE" && exec "$VENV/bin/python" -m deadman.worker) > "$LOGS/worker.log" 2>&1 &
  pids+=($!); names+=(worker)

  log "running. Ctrl-C stops all three."
  # A bare `wait` blocks until every child has gone, so a crashed gateway would be
  # invisible while the API sat there accepting check-ins it could never alert on.
  # bash 3.2 (still the system bash on macOS) has no `wait -n`, so poll instead.
  while :; do
    sleep 1
    for i in "${!pids[@]}"; do
      if ! kill -0 "${pids[$i]}" 2>/dev/null; then
        warn "${names[$i]} exited; see $LOGS/${names[$i]}.log"
        exit 1
      fi
    done
  done
}

cmd_doctor() {
  ensure_venv
  local code_token wa_token host port url
  code_token=$(env_get "$CODE/.env" WHATSAPP_BOT_TOKEN)
  wa_token=$(env_get "$WA/.env" WHATSAPP_BOT_TOKEN)
  host=$(env_get "$WA/.env" HOST); host=${host:-127.0.0.1}
  port=$(env_get "$WA/.env" PORT); port=${port:-8080}
  url=$(gateway_url)

  log "code/.env        exists: $([[ -f $CODE/.env ]] && echo yes || echo NO)"
  log "whatsapp/.env    exists: $([[ -f $WA/.env ]] && echo yes || echo NO)"
  if [[ -n $code_token && $code_token == "$wa_token" ]]; then
    log "shared token     set and matching (${#code_token} chars)"
  else
    printf '\033[1;31merror:\033[0m shared token mismatch: code=%s whatsapp=%s\n' \
      "${code_token:+set}${code_token:-missing}" "${wa_token:+set}${wa_token:-missing}" >&2
  fi
  if [[ $(env_get "$CODE/.env" WHATSAPP_BOT_URL) == "$url" ]]; then
    log "WHATSAPP_BOT_URL matches the gateway ($url)"
  else
    warn "WHATSAPP_BOT_URL is $(env_get "$CODE/.env" WHATSAPP_BOT_URL) but the gateway is at $url"
  fi
  if [[ -f $WA/store.db ]]; then
    log "paired session   present (store.db) - keep this out of git"
  else
    log "paired session   none yet (no store.db)"
  fi
  if health=$(curl -fsS --max-time 2 "$url/health" 2>/dev/null); then
    log "gateway health   $health"
    if [[ -f $WA/store.db ]] && ! gateway_is_paired "$url"; then
      # A session on disk that is no longer logged in is the state that makes the
      # gateway refuse to start: whatsmeow will not re-issue a QR for a store that
      # still holds a device id. Only `pair` clears it.
      warn "a session is stored but not logged in - the account was likely unlinked."
      warn "run 'scripts/dev.sh pair' to clear it and scan a fresh QR."
    fi
  else
    warn "the gateway is not answering on $url (is 'dev.sh run' up?)"
  fi
  if [[ -x $VENV/bin/python ]]; then
    log "venv             present"
  else
    warn "no venv: run 'scripts/dev.sh setup'"
  fi
}

cmd_token() {
  local generated
  generated=$(openssl rand -hex 32)
  bootstrap_env "$CODE"
  bootstrap_env "$WA"
  env_set "$CODE/.env" WHATSAPP_BOT_TOKEN "$generated"
  env_set "$WA/.env" WHATSAPP_BOT_TOKEN "$generated"
  log "regenerated the shared token in both .env files"
  log "restart the gateway for it to take effect"
}

cmd_pair() {
  ensure_deps
  bootstrap_env "$WA"
  [[ -x $GATEWAY_BIN ]] || (cd "$WA" && go build -o main .)
  # The stored session is the account credential; dropping it here is also the
  # supported way to un-pair a device that is no longer wanted.
  rm -f "$WA/store.db" "$WA/store.db-shm" "$WA/store.db-wal" "$WA/qr.png"
  log "cleared the stored session; scan the QR below with your phone"
  log "  WhatsApp > Settings > Linked Devices > Link a Device"
  log "  (the code also lands in $WA/qr.png, and it is re-issued every minute or so)"
  # Runs in the foreground: the QR is printed inline and Ctrl-C stops it.
  (cd "$WA" && exec ./main)
}

cmd=""
for arg in "$@"; do
  case "$arg" in
    --no-wait) WAIT_FOR_PAIRING=0 ;;
    -h|--help|help) usage; exit 0 ;;
    -*) die "unknown option: $arg (try --help)" ;;
    *)
      if [[ -z $cmd ]]; then cmd=$arg; else die "unexpected argument: $arg (try --help)"; fi
      ;;
  esac
done

case "$cmd" in
  setup)  cmd_setup ;;
  test)   cmd_test ;;
  build)  cmd_build ;;
  run)    cmd_run ;;
  doctor) cmd_doctor ;;
  token)  cmd_token ;;
  pair)   cmd_pair ;;
  "")     usage; exit 1 ;;
  *)      usage; exit 1 ;;
esac
