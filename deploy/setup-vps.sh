#!/usr/bin/env bash
# Repeatable server setup / update for DRISHTI AI on an Ubuntu VPS with Docker.
# Run as root from the uploaded release directory:
#
#   sudo bash deploy/setup-vps.sh [port]        # default port 8090
#
# The API runs under PM2 on 127.0.0.1:5000; a caddy:2-alpine container on the
# host network serves the built frontend on <port> and proxies /api to the API.
# No system web server is installed, so other sites on the box are untouched.
#
# Expects /var/www/drishti-ai/backend/.env to exist (copy backend/.env.example
# and fill it in). Re-running it is safe: it reinstalls deps, rebuilds and reloads.
set -euo pipefail

PORT="${1:-8090}"
APP_DIR=/var/www/drishti-ai
SRC_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Checking prerequisites"
if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 18 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
command -v pm2 >/dev/null || npm install -g pm2
command -v docker >/dev/null || { echo "!! Docker is required." >&2; exit 1; }

echo "==> Syncing code to $APP_DIR"
mkdir -p "$APP_DIR"
if [ "$SRC_DIR" != "$APP_DIR" ]; then
  # Keep the server's .env; everything else comes from the release.
  tar -C "$SRC_DIR" --exclude=node_modules --exclude=.git --exclude=ml-backend \
      --exclude=backend/.env -cf - . | tar -C "$APP_DIR" -xf -
fi

if [ ! -f "$APP_DIR/backend/.env" ]; then
  echo "!! $APP_DIR/backend/.env is missing. Create it from backend/.env.example, then re-run." >&2
  exit 1
fi
# Browsers send an Origin header on POSTs even to the same origin, and the API
# rejects unknown origins in production — so CLIENT_URL must name this site.
grep -q "^CLIENT_URL=.*:$PORT" "$APP_DIR/backend/.env" ||
  echo "!! Warning: CLIENT_URL in backend/.env should include http://<server>:$PORT"

echo "==> Backend dependencies"
cd "$APP_DIR/backend"
npm ci --omit=dev

echo "==> Frontend build (API on the same origin at /api)"
cd "$APP_DIR/frontend"
npm ci
VITE_API_BASE_URL=/api npm run build

echo "==> API (PM2)"
pm2 startOrReload "$APP_DIR/deploy/ecosystem.config.js" --update-env
pm2 save

echo "==> Web (Caddy on :$PORT)"
docker rm -f drishti-web >/dev/null 2>&1 || true
docker run -d --name drishti-web --restart unless-stopped --network host \
  -e DRISHTI_PORT="$PORT" \
  -v "$APP_DIR/deploy/Caddyfile:/etc/caddy/Caddyfile:ro" \
  -v "$APP_DIR/frontend/dist:/srv/drishti:ro" \
  caddy:2-alpine >/dev/null
command -v ufw >/dev/null && ufw allow "$PORT/tcp" comment "DRISHTI AI" >/dev/null || true

echo "==> Health check"
sleep 3
curl -s -o /dev/null -w "web  %{http_code}\n" "http://127.0.0.1:$PORT/"
curl -s -w "\n" "http://127.0.0.1:$PORT/api/health" || true
echo "Done."
