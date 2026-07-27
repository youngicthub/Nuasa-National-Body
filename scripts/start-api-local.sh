#!/usr/bin/env bash
# start-api-local.sh — starts the API server for LOCAL development.
# Prerequisites:
#   1. MySQL 8.x running locally (via Homebrew, WAMP, XAMPP, etc.)
#   2. A .env.local file in the project root with your DB credentials
#      (copy .env.example and fill in your values)
#   3. pnpm installed globally: npm install -g pnpm
#   4. Dependencies installed: pnpm install
#
# Usage:
#   bash scripts/start-api-local.sh
#
# In a second terminal, run the frontend:
#   pnpm --filter @workspace/nuasa run dev
set -euo pipefail

# ── Load .env.local if it exists ─────────────────────────────────────────────
ENV_FILE="$(dirname "$0")/../.env.local"
if [ -f "$ENV_FILE" ]; then
  echo "[local] Loading $ENV_FILE"
  # export every non-comment, non-blank line
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

# ── Defaults ─────────────────────────────────────────────────────────────────
export PORT="${PORT:-8080}"
export DB_HOST="${DB_HOST:-127.0.0.1}"
export DB_PORT="${DB_PORT:-3306}"
export DB_NAME="${DB_NAME:-nuasa_database}"
export DB_USER="${DB_USER:-root}"
export DB_PASSWORD="${DB_PASSWORD:-}"
export JWT_SECRET="${JWT_SECRET:-local-dev-jwt-secret-change-me}"
export SESSION_SECRET="${SESSION_SECRET:-local-dev-session-secret-change-me}"
export FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"
export NODE_ENV="${NODE_ENV:-development}"

echo "[local] API → http://localhost:${PORT}/api"
echo "[local] DB  → ${DB_HOST}:${DB_PORT}/${DB_NAME} (user: ${DB_USER})"

# ── Ensure the DB / schema exists ────────────────────────────────────────────
SCHEMA_FILE="$(dirname "$0")/../database.sql"
if [ -f "$SCHEMA_FILE" ]; then
  echo "[local] Checking schema..."
  TABLE_COUNT=$(mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" \
    ${DB_PASSWORD:+-p"$DB_PASSWORD"} -N -e \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}';" \
    2>/dev/null || echo "0")
  if [ "${TABLE_COUNT:-0}" -eq 0 ]; then
    echo "[local] Creating database and importing schema..."
    mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" \
      ${DB_PASSWORD:+-p"$DB_PASSWORD"} \
      -e "CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" \
      ${DB_PASSWORD:+-p"$DB_PASSWORD"} "$DB_NAME" < "$SCHEMA_FILE"
    echo "[local] Schema imported."
  else
    echo "[local] Schema already present (${TABLE_COUNT} tables)."
  fi
fi

# ── Build and start the API ───────────────────────────────────────────────────
cd "$(dirname "$0")/../artifacts/api-server"
echo "[local] Building..."
pnpm run build
echo "[local] Starting..."
exec node --enable-source-maps ./dist/index.mjs
