#!/usr/bin/env bash
# start-api.sh — starts MySQL (if not using Neon) then the API server
set -euo pipefail

# ── Base URL auto-detection ───────────────────────────────────────────────────
if [ "${NODE_ENV:-development}" = "production" ]; then
  export FRONTEND_URL="${FRONTEND_URL:-http://nuasanational.com.ng}"
else
  export FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"
fi
echo "[start-api] FRONTEND_URL=${FRONTEND_URL}"

# ── If Neon database URL is configured, skip MySQL entirely ───────────────────
if [ -n "${NEON_DATABASE_URL:-}" ]; then
  echo "[start-api] NEON_DATABASE_URL detected — skipping MySQL, using Neon PostgreSQL"
  cd /home/runner/workspace/artifacts/api-server
  echo "[start-api] Building API server..."
  npm run build
  echo "[start-api] Starting API server..."
  exec node --enable-source-maps ./dist/index.mjs
fi

# ── MySQL path (local development fallback) ───────────────────────────────────
MYSQL_DATADIR="/home/runner/.mysql-data"
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
  --socket="$MYSQL_SOCK"
  --pid-file="$MYSQL_RUNDIR/mysqld.pid"
  --log-error="$MYSQL_LOG"
  --port=3306
  --bind-address=127.0.0.1
  --mysqlx=OFF
  --user=runner
)

mkdir -p "$MYSQL_DATADIR" "$MYSQL_RUNDIR"

if [ ! -f "$MYSQL_DATADIR/mysql.ibd" ]; then
  echo "[start-api] Initializing MySQL data directory..."
  rm -f "$MYSQL_DATADIR/is_writable" "$MYSQL_DATADIR/is_readable" \
        "$MYSQL_DATADIR"/*.pem 2>/dev/null || true
  mysqld \
    --initialize-insecure \
    --datadir="$MYSQL_DATADIR" \
    --basedir="$MYSQL_BASEDIR" \
    --user=runner 2>&1
  echo "[start-api] Init complete"
fi

rm -f "$MYSQL_SOCK" "$MYSQL_RUNDIR/mysqld.sock.lock" "$MYSQL_RUNDIR/mysqld.pid"
rm -f "$MYSQL_DATADIR"/undo_*

echo "[start-api] Starting mysqld..."
mysqld "${MYSQLD_ARGS[@]}" &
MYSQLD_PID=$!

cleanup() {
  echo "[start-api] Shutting down mysqld (pid $MYSQLD_PID)..."
  mysqladmin --socket="$MYSQL_SOCK" shutdown 2>/dev/null \
    || kill "$MYSQLD_PID" 2>/dev/null \
    || true
  wait "$MYSQLD_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

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

cd /home/runner/workspace/artifacts/api-server
echo "[start-api] Building API server..."
npm run build

echo "[start-api] Starting API server..."
exec node --enable-source-maps ./dist/index.mjs
