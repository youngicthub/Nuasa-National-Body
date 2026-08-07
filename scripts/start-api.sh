#!/usr/bin/env bash
# start-api.sh — starts PostgreSQL then the API server
set -euo pipefail

# ── Base URL auto-detection ───────────────────────────────────────────────────
if [ "${NODE_ENV:-development}" = "production" ]; then
  export FRONTEND_URL="${FRONTEND_URL:-http://nuasanational.com.ng}"
else
  export FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"
fi
echo "[start-api] FRONTEND_URL=${FRONTEND_URL}"

# ── If a remote database URL is configured, skip local PostgreSQL ─────────────
# Replit commonly exposes an attached Neon database as DATABASE_URL. Keep
# NEON_DATABASE_URL supported for existing deployments, but prefer either
# configured remote URL over silently starting an empty local database.
REMOTE_DATABASE_URL="${NEON_DATABASE_URL:-}"
if [ -n "$REMOTE_DATABASE_URL" ]; then
  if [ -n "${NEON_DATABASE_URL:-}" ]; then
    echo "[start-api] NEON_DATABASE_URL detected — skipping local PostgreSQL"
  else
    echo "[start-api] DATABASE_URL detected — skipping local PostgreSQL"
  fi
  cd /home/runner/workspace/artifacts/api-server
  echo "[start-api] Building API server..."
  pnpm run build
  echo "[start-api] Starting API server..."
  exec node --enable-source-maps ./dist/index.mjs
fi

# ── Local PostgreSQL (dev fallback) ───────────────────────────────────────────
PG_BIN="/nix/store/p1bjsswnxgb73742slz0w2h0049nydk2-replit-runtime-path/bin"
PG_DATADIR="/home/runner/.pg-data"
PG_RUNDIR="/home/runner/.pg-run"
PG_PORT=5432
_DB_NAME="${DB_NAME:-nuasa_database}"
_DB_USER="${DB_USER:-nuasa_user}"
_DB_PASS="${DB_PASSWORD:-nuasa_pass_2026}"

mkdir -p "$PG_DATADIR" "$PG_RUNDIR"

# Initialise data directory on first boot
if [ ! -f "$PG_DATADIR/PG_VERSION" ]; then
  echo "[start-api] Initializing PostgreSQL data directory..."
  "$PG_BIN/initdb" -D "$PG_DATADIR" \
    --username=runner \
    --auth=trust \
    --encoding=UTF8 \
    --locale=C 2>&1
  echo "[start-api] Init complete"
fi

# Remove stale socket / lock / PID files from a previous run
rm -f "$PG_RUNDIR"/.s.PGSQL.* 2>/dev/null || true
rm -f "$PG_DATADIR/postmaster.pid" 2>/dev/null || true

echo "[start-api] Starting PostgreSQL..."
"$PG_BIN/postgres" \
  -D "$PG_DATADIR" \
  -k "$PG_RUNDIR" \
  -p "$PG_PORT" \
  -c log_destination=stderr \
  -c logging_collector=off \
  &
POSTGRES_PID=$!

cleanup() {
  echo "[start-api] Shutting down PostgreSQL (pid $POSTGRES_PID)..."
  kill "$POSTGRES_PID" 2>/dev/null || true
  wait "$POSTGRES_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "[start-api] Waiting for PostgreSQL..."
for i in $(seq 1 30); do
  if "$PG_BIN/pg_isready" -h 127.0.0.1 -p "$PG_PORT" -U runner -q 2>/dev/null; then
    echo "[start-api] PostgreSQL ready after ${i}s"
    break
  fi
  sleep 1
  if ! kill -0 "$POSTGRES_PID" 2>/dev/null; then
    echo "[start-api] postgres exited unexpectedly"
    exit 1
  fi
  if [ "$i" -eq 30 ]; then
    echo "[start-api] PostgreSQL did not start in 30s"
    exit 1
  fi
done

# Override DB connection env vars so the pg driver connects to local PG
unset DATABASE_URL NEON_DATABASE_URL
export DB_HOST=127.0.0.1
export DB_PORT="$PG_PORT"
export DB_USER="$_DB_USER"
export DB_NAME="$_DB_NAME"
export DB_PASSWORD="$_DB_PASS"

SETUP_MARKER="$PG_RUNDIR/.db_setup_done"
if [ ! -f "$SETUP_MARKER" ]; then
  echo "[start-api] Running first-time DB setup..."
  "$PG_BIN/psql" -h 127.0.0.1 -p "$PG_PORT" -U runner -d postgres \
    -c "CREATE USER \"${_DB_USER}\" WITH PASSWORD '${_DB_PASS}';" 2>/dev/null || true
  "$PG_BIN/psql" -h 127.0.0.1 -p "$PG_PORT" -U runner -d postgres \
    -c "CREATE DATABASE \"${_DB_NAME}\" OWNER \"${_DB_USER}\";" 2>/dev/null || true

  SCHEMA_FILE="/home/runner/workspace/scripts/postgres-schema.sql"
  if [ -f "$SCHEMA_FILE" ]; then
    echo "[start-api] Importing PostgreSQL schema..."
    "$PG_BIN/psql" -h 127.0.0.1 -p "$PG_PORT" -U runner -d "$_DB_NAME" \
      -f "$SCHEMA_FILE" 2>&1
    echo "[start-api] Schema imported successfully"
  fi

  # Grant the app user full access to all tables/sequences created by runner
  "$PG_BIN/psql" -h 127.0.0.1 -p "$PG_PORT" -U runner -d "$_DB_NAME" \
    -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO \"${_DB_USER}\"; \
        GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO \"${_DB_USER}\"; \
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO \"${_DB_USER}\"; \
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO \"${_DB_USER}\";" 2>&1
  echo "[start-api] Permissions granted to ${_DB_USER}"

  touch "$SETUP_MARKER"
  echo "[start-api] DB setup complete"
fi

cd /home/runner/workspace/artifacts/api-server
echo "[start-api] Building API server..."
pnpm run build

echo "[start-api] Starting API server..."
exec node --enable-source-maps ./dist/index.mjs
