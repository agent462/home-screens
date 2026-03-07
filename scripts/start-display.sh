#!/usr/bin/env bash
set -euo pipefail

# Start Home Screens display manually
# Usage: ./start-display.sh [project-dir]

APP_DIR="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
SERVER_PID=""
BROWSER_PID=""

cleanup() {
  echo "Shutting down..."
  [ -n "${BROWSER_PID}" ] && kill "${BROWSER_PID}" 2>/dev/null || true
  [ -n "${SERVER_PID}" ] && kill "${SERVER_PID}" 2>/dev/null || true
  wait 2>/dev/null
  exit 0
}

trap cleanup SIGTERM SIGINT SIGHUP

cd "${APP_DIR}"

echo "Building project..."
npm run build

echo "Starting Next.js server..."
npm start &
SERVER_PID=$!

echo "Waiting for server to be ready..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:3000 > /dev/null 2>&1; then
    echo "Server is ready."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "Server failed to start within 30 seconds."
    cleanup
  fi
  sleep 1
done

echo "Launching Chromium in kiosk mode..."
chromium-browser \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --no-first-run \
  --disable-session-crashed-bubble \
  --disable-translate \
  http://localhost:3000/display &
BROWSER_PID=$!

echo "Display running. Press Ctrl+C to stop."
wait
