#!/usr/bin/env bash
# start-api.sh — starts MySQL then the API server (both owned by this process)
set -euo pipefail

# ── Base URL auto-detection ───────────────────────────────────────────────────
# Production (NODE_ENV=production) → live domain
# Everything else                  → localhost (Vite dev server default port)
if [ "${NODE_ENV:-development}" = "production" ]; then
  export FRONTEND_URL="${FRONTEND_URL:-http://nuasanational.com.ng}"
else
  export FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"
fi
echo "[start-api] FRONTEND_URL=${FRONTEND_URL}"

MYSQL_DATADIR="/home/runner/.mysql-data"
MYSQL_UNDODIR="/home/runner/.mysql-undo"
MYSQL_RUNDIR="/home/runner/.mysql-run"
MYSQL_SOCK="$MYSQL_RUNDIR/mysqld.sock"
MYSQL_LOG="$MYSQL_RUNDIR/error.log"
MYSQL_BASEDIR="/nix/store/s2lbn1axpc79kwnc829k5idkwabfq459-mysql-8.0.42"
DB_NAME="${DB_NAME:-nuasa_database}"
DB_USER="${DB_USER:-nuasa_user}"
DB_PASSWORD="${DB_PASSWORD:-}"

MYSQLD_ARGS=(
  --datadir="$MYSQL_DATADIR"
  --basedir="$MYSQL_BASEDIR"
  # undo dir must be SEPARATE from datadir; init (below) puts its own undo
  # files in datadir — that's fine, mysqld will manage its own in UNDODIR.
  --innodb-undo-directory="$MYSQL_UNDODIR"
  --socket="$MYSQL_SOCK"
  --pid-file="$MYSQL_RUNDIR/mysqld.pid"
  --log-error="$MYSQL_LOG"
  --port=3306
  --bind-address=127.0.0.1
  --mysqlx=OFF
  --user=runner
)

mkdir -p "$MYSQL_DATADIR" "$MYSQL_UNDODIR" "$MYSQL_RUNDIR"

# ── 1. Initialize data directory once ─────────────────────────────────────────
# IMPORTANT: run init WITHOUT --innodb-undo-directory so that the data
# dictionary does NOT register a separate undo dir. mysqld will then find an
# empty UNDODIR on first start and create its own undo tablespaces there.
if [ ! -f "$MYSQL_DATADIR/mysql.ibd" ]; then
  echo "[start-api] Initializing MySQL data directory..."
  mysqld \
    --initialize-insecure \
    --datadir="$MYSQL_DATADIR" \
    --basedir="$MYSQL_BASEDIR" \
    --user=runner 2>&1
  echo "[start-api] Init complete"
fi

# ── 2. Clean up stale socket / pid / undo files from a previous run ──────────
rm -f "$MYSQL_SOCK" "$MYSQL_RUNDIR/mysqld.sock.lock" "$MYSQL_RUNDIR/mysqld.pid"
# Undo tablespace files must not pre-exist when mysqld starts; remove them so
# mysqld recreates them cleanly (data lives in datadir, not here).
rm -f "$MYSQL_UNDODIR"/undo_*

# ── 3. Launch mysqld in the background ────────────────────────────────────────
echo "[start-api] Starting mysqld..."
mysqld "${MYSQLD_ARGS[@]}" &
MYSQLD_PID=$!

# Shut mysqld down cleanly when this script exits
cleanup() {
  echo "[start-api] Shutting down mysqld (pid $MYSQLD_PID)..."
  mysqladmin --socket="$MYSQL_SOCK" shutdown 2>/dev/null \
    || kill "$MYSQLD_PID" 2>/dev/null \
    || true
  wait "$MYSQLD_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# ── 4. Wait for mysqld to be ready (up to 30 s) ───────────────────────────────
echo "[start-api] Waiting for MySQL..."
for i in $(seq 1 30); do
  if mysqladmin --socket="$MYSQL_SOCK" ping --silent 2>/dev/null; then
    echo "[start-api] MySQL ready after ${i}s"
    break
  fi
  sleep 1
  if ! kill -0 "$MYSQLD_PID" 2>/dev/null; then
    echo "[start-api] mysqld exited unexpectedly. Last log:"
    tail -20 "$MYSQL_LOG"
    exit 1
  fi
  if [ "$i" -eq 30 ]; then
    echo "[start-api] MySQL did not start in 30s. Last log:"
    tail -20 "$MYSQL_LOG"
    exit 1
  fi
done

# ── 5. One-time DB / user / schema setup ─────────────────────────────────────
SETUP_MARKER="$MYSQL_RUNDIR/.db_setup_done"
if [ ! -f "$SETUP_MARKER" ]; then
  echo "[start-api] Running first-time DB setup..."
  mysql -u root --socket="$MYSQL_SOCK" <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
CREATE USER IF NOT EXISTS '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL

  SCHEMA_FILE="/home/runner/workspace/database.sql"
  if [ -f "$SCHEMA_FILE" ]; then
    TABLE_COUNT=$(mysql -u root --socket="$MYSQL_SOCK" -N -e \
      "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}';" 2>/dev/null || echo 0)
    if [ "${TABLE_COUNT}" -eq 0 ]; then
      echo "[start-api] Importing schema from database.sql..."
      mysql -u root --socket="$MYSQL_SOCK" "${DB_NAME}" < "$SCHEMA_FILE"
      echo "[start-api] Schema imported successfully"
    else
      echo "[start-api] Schema already present (${TABLE_COUNT} tables), skipping"
    fi
  fi

  touch "$SETUP_MARKER"
  echo "[start-api] DB setup complete"
fi

# ── 6. Build and start the API server ────────────────────────────────────────
cd /home/runner/workspace/artifacts/api-server
echo "[start-api] Building API server..."
pnpm run build

echo "[start-api] Starting API server..."
exec node --enable-source-maps ./dist/index.mjs
