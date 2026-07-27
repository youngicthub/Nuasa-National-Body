#!/usr/bin/env bash
# start-local.sh — start the full NUASA stack on your local machine
# Usage: bash scripts/start-local.sh
#
# Requirements:
#   • Node.js 20+ and pnpm installed  (https://pnpm.io/installation)
#   • MySQL 8.0 running locally
#   • A filled-in .env file at the project root  (copy from .env.example)
#
# What it does:
#   1. Loads your .env
#   2. Creates the MySQL database + user (if they don't exist yet)
#   3. Imports database.sql into the database (first run only)
#   4. Installs pnpm dependencies (if node_modules is missing)
#   5. Builds + starts the API server in the background   → http://localhost:5000
#   6. Starts the Vite dev frontend in the foreground     → http://localhost:5173

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

# ── 1. Load .env ──────────────────────────────────────────────────────────────
if [ ! -f "$ENV_FILE" ]; then
  echo ""
  echo "  ERROR: .env file not found at $ENV_FILE"
  echo "  Copy the example and fill in your values:"
  echo "    cp .env.example .env"
  echo ""
  exit 1
fi

# Export every KEY=VALUE line (skip comments and blanks)
set -o allexport
# shellcheck disable=SC1090
source "$ENV_FILE"
set +o allexport

# ── Base URL auto-detection ───────────────────────────────────────────────────
if [ "${NODE_ENV:-development}" = "production" ]; then
  export FRONTEND_URL="${FRONTEND_URL:-http://nuasanational.com.ng}"
else
  export FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"
fi

export PORT="${PORT:-5000}"

echo ""
echo "  NUASA Local Dev"
echo "  ─────────────────────────────────────────────"
echo "  NODE_ENV    : ${NODE_ENV:-development}"
echo "  FRONTEND_URL: $FRONTEND_URL"
echo "  API port    : $PORT"
echo "  DB host     : ${DB_HOST:-127.0.0.1}:${DB_PORT:-3306}  db=${DB_NAME:-nuasa_database}"
echo "  ─────────────────────────────────────────────"
echo ""

# ── 2. Check MySQL is reachable ───────────────────────────────────────────────
if ! mysql -h "${DB_HOST:-127.0.0.1}" -P "${DB_PORT:-3306}" -u root \
     --connect-timeout=5 -e "SELECT 1;" &>/dev/null; then
  echo "  ERROR: Cannot connect to MySQL at ${DB_HOST:-127.0.0.1}:${DB_PORT:-3306} as root."
  echo "  Make sure MySQL 8.0 is running and root has no password (or update the command above)."
  exit 1
fi
echo "[start-local] MySQL reachable ✓"

# ── 3. Create DB + user (idempotent) ─────────────────────────────────────────
DB_NAME="${DB_NAME:-nuasa_database}"
DB_USER="${DB_USER:-nuasa_user}"
DB_PASSWORD="${DB_PASSWORD:-}"

mysql -h "${DB_HOST:-127.0.0.1}" -P "${DB_PORT:-3306}" -u root <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost'  IDENTIFIED BY '${DB_PASSWORD}';
CREATE USER IF NOT EXISTS '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL
echo "[start-local] DB + user ready ✓"

# ── 4. Import database.sql (first run only) ───────────────────────────────────
SCHEMA_FILE="$ROOT_DIR/database.sql"
if [ -f "$SCHEMA_FILE" ]; then
  TABLE_COUNT=$(mysql -h "${DB_HOST:-127.0.0.1}" -P "${DB_PORT:-3306}" -u root -N \
    -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}';" 2>/dev/null || echo 0)
  if [ "${TABLE_COUNT}" -eq 0 ]; then
    echo "[start-local] Importing database.sql ..."
    mysql -h "${DB_HOST:-127.0.0.1}" -P "${DB_PORT:-3306}" -u root "${DB_NAME}" < "$SCHEMA_FILE"
    echo "[start-local] Import complete ✓"
  else
    echo "[start-local] Database already has ${TABLE_COUNT} tables — skipping import ✓"
  fi
else
  echo "[start-local] WARNING: database.sql not found — skipping schema import"
fi

# ── 5. Install dependencies if needed ────────────────────────────────────────
if [ ! -d "$ROOT_DIR/node_modules" ]; then
  echo "[start-local] Installing pnpm dependencies..."
  cd "$ROOT_DIR" && pnpm install
fi

# ── 6. Build + start API server in background ────────────────────────────────
echo "[start-local] Building and starting API server on port $PORT ..."
cd "$ROOT_DIR/artifacts/api-server"
pnpm run build
node --env-file="$ENV_FILE" --enable-source-maps ./dist/index.mjs &
API_PID=$!
echo "[start-local] API server PID $API_PID"

# Wait for API to be ready (up to 15 s)
for i in $(seq 1 15); do
  if curl -sf "http://localhost:${PORT}/api/health" &>/dev/null \
     || curl -sf "http://localhost:${PORT}/api/categories" &>/dev/null; then
    echo "[start-local] API ready ✓"
    break
  fi
  sleep 1
  if ! kill -0 "$API_PID" 2>/dev/null; then
    echo "[start-local] ERROR: API server exited unexpectedly"
    exit 1
  fi
done

# Kill API on exit
trap 'echo "[start-local] Stopping API server..."; kill "$API_PID" 2>/dev/null || true' EXIT INT TERM

# ── 7. Start Vite frontend (foreground) ───────────────────────────────────────
echo ""
echo "  ✅  Stack is up!"
echo "  Frontend → http://localhost:5173"
echo "  API      → http://localhost:${PORT}/api"
echo ""
cd "$ROOT_DIR"
PORT=5173 pnpm --filter @workspace/nuasa run dev
