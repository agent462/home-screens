#!/usr/bin/env bash
set -euo pipefail

# Home Screens - Deploy to Raspberry Pi
# Syncs code, installs dependencies, builds, and restarts the service.
#
# Usage:
#   ./scripts/deploy.sh                          # deploy to default host
#   ./scripts/deploy.sh -h signal@192.168.86.50  # deploy to specific host
#   ./scripts/deploy.sh --skip-install            # skip npm install
#   ./scripts/deploy.sh --restart-only            # just restart the service

DEFAULT_HOST="signal@192.168.86.143"
REMOTE_DIR="home-screens"
SKIP_INSTALL=false
RESTART_ONLY=false
HOST=""

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
DIM='\033[2m'
NC='\033[0m'

info()  { echo -e "${GREEN}[*]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[x]${NC} $1"; exit 1; }
step()  { echo -e "\n${GREEN}==>${NC} $1"; }

usage() {
  echo "Usage: $0 [options]"
  echo ""
  echo "Options:"
  echo "  -h, --host HOST    Deploy target (default: ${DEFAULT_HOST})"
  echo "  --skip-install     Skip npm install on remote"
  echo "  --restart-only     Just restart the service, no sync"
  echo "  --help             Show this help"
  exit 0
}

# --- Parse args ---
while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--host)       HOST="$2"; shift 2 ;;
    --skip-install)  SKIP_INSTALL=true; shift ;;
    --restart-only)  RESTART_ONLY=true; shift ;;
    --help)          usage ;;
    *)               error "Unknown option: $1" ;;
  esac
done

HOST="${HOST:-$DEFAULT_HOST}"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

info "Deploying to ${HOST}:~/${REMOTE_DIR}"

# --- Restart only ---
if [ "$RESTART_ONLY" = true ]; then
  step "Restarting service..."
  ssh "$HOST" "sudo systemctl restart home-screens"
  info "Service restarted."
  exit 0
fi

# --- Sync files ---
step "Syncing files..."
rsync -azP --delete \
  --exclude 'node_modules' \
  --exclude '.next/cache' \
  --exclude '.git' \
  --exclude '*.tsbuildinfo' \
  --exclude '.env.local' \
  --exclude 'data/config.json' \
  --exclude 'data/google-tokens.json' \
  --exclude 'data/client*' \
  --exclude 'data/secrets.json' \
  --exclude 'data/auth.json' \
  --exclude 'data/backups' \
  --exclude 'data/background-cache.json' \
  --exclude 'data/kiosk.conf' \
  --exclude 'public/backgrounds/*.jpg' \
  --exclude 'public/backgrounds/*.jpeg' \
  --exclude 'public/backgrounds/*.png' \
  --exclude 'public/backgrounds/*.webp' \
  "$PROJECT_DIR/" "$HOST:~/$REMOTE_DIR/"

# --- Build locally ---
step "Building locally..."
cd "$PROJECT_DIR" && npm run build

# --- Sync build output ---
step "Syncing build output..."
rsync -azP --delete \
  --exclude 'cache' \
  "$PROJECT_DIR/.next/" "$HOST:~/$REMOTE_DIR/.next/"

# --- Install dependencies ---
if [ "$SKIP_INSTALL" = false ]; then
  step "Installing dependencies..."
  ssh "$HOST" "cd ~/$REMOTE_DIR && npm install --omit=dev"
fi

# --- Apply system config ---
step "Applying system configuration..."
ssh "$HOST" "cd ~/$REMOTE_DIR && bash scripts/upgrade.sh setup-system"

# --- Restart service ---
step "Restarting service..."
ssh "$HOST" "sudo systemctl restart home-screens"

# --- Verify ---
step "Verifying..."
info "Kiosk browser will auto-reload when it detects the new build."
if ssh "$HOST" "systemctl is-active --quiet home-screens"; then
  echo ""
  REMOTE_IP="${HOST#*@}"
  info "Deploy complete!"
  echo -e "  ${DIM}Display:${NC}  http://${REMOTE_IP}:3000/display"
  echo -e "  ${DIM}Editor:${NC}   http://${REMOTE_IP}:3000/editor"
  echo ""
else
  warn "Service may not have started correctly."
  ssh "$HOST" "journalctl -u home-screens -n 20 --no-pager"
fi
