#!/usr/bin/env bash
set -euo pipefail

# Home Screens - Raspberry Pi Install Script
# Downloads a pre-built release from GitHub and configures the kiosk.
#
# Usage:
#   git clone https://github.com/agent462/home-screens.git
#   ~/home-screens/scripts/install.sh

INSTALL_BASE="/opt/home-screens"
APP_DIR="${INSTALL_BASE}/current"
REPO="agent462/home-screens"
NODE_MAJOR=22

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[*]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[x]${NC} $1"; exit 1; }

# Reattach stdin to the terminal for interactive prompts
# (needed when piped or redirected).
if [ ! -t 0 ]; then
  exec < /dev/tty
fi

# --- Preflight ---
if [ "$(uname -m)" != "aarch64" ]; then
  if [ "$(uname -m)" = "armv7l" ]; then
    error "32-bit Raspberry Pi OS detected. Home Screens requires 64-bit (aarch64)."
  fi
  warn "This doesn't look like a Raspberry Pi ($(uname -m)). Continuing anyway..."
fi

if [ "$(id -u)" -eq 0 ]; then
  error "Don't run this script as root. It will use sudo when needed."
fi

# --- Step 1: Bootstrap packages ---
info "Installing bootstrap packages..."
sudo apt-get update -qq
sudo apt-get install -y -qq curl

# --- Step 2: Node.js ---
if command -v node &>/dev/null; then
  CURRENT_NODE=$(node -v | sed 's/v//' | cut -d. -f1)
  if [ "${CURRENT_NODE}" -ge "${NODE_MAJOR}" ]; then
    info "Node.js $(node -v) already installed, skipping."
  else
    warn "Node.js $(node -v) is too old. Installing Node.js ${NODE_MAJOR}..."
    curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash -
    sudo apt-get install -y -qq nodejs
  fi
else
  info "Installing Node.js ${NODE_MAJOR}..."
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash -
  sudo apt-get install -y -qq nodejs
fi

info "Node $(node -v) / npm $(npm -v)"

# --- Step 3: Download latest release ---
info "Fetching latest release..."
LATEST_TAG=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" | node -e "
  let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{
    try { console.log(JSON.parse(d).tag_name); }
    catch { process.exit(1); }
  });
")

if [ -z "${LATEST_TAG}" ]; then
  error "Could not determine latest release tag."
fi

info "Downloading ${LATEST_TAG}..."
ASSET_NAME="home-screens-${LATEST_TAG}.tar.gz"
DOWNLOAD_URL="https://github.com/${REPO}/releases/download/${LATEST_TAG}/${ASSET_NAME}"

if ! curl -fSL --speed-limit 1024 --speed-time 60 -o "/tmp/${ASSET_NAME}" "${DOWNLOAD_URL}"; then
  error "Failed to download release tarball."
fi

# Create the install base owned by the current user.
# The app lives in current/, with staging/rollback siblings for atomic upgrades.
if [ ! -d "${INSTALL_BASE}" ]; then
  sudo mkdir -p "${INSTALL_BASE}"
  sudo chown "${USER}:${USER}" "${INSTALL_BASE}"
fi

# Preserve any existing data/ directory from a prior install.
if [ -d "${APP_DIR}/data" ]; then
  mv "${APP_DIR}/data" "/tmp/home-screens-data-$$"
fi

rm -rf "${APP_DIR}"
mkdir -p "${APP_DIR}"

info "Extracting..."
tar -xzf "/tmp/${ASSET_NAME}" -C "${APP_DIR}"
rm -f "/tmp/${ASSET_NAME}"

# Restore user data if we saved it
if [ -d "/tmp/home-screens-data-$$" ]; then
  rm -rf "${APP_DIR}/data"
  mv "/tmp/home-screens-data-$$" "${APP_DIR}/data"
fi

# Validate
if [ ! -f "${APP_DIR}/server.js" ] || [ ! -f "${APP_DIR}/package.json" ]; then
  error "Tarball is missing required files (server.js, package.json)."
fi

info "Installed ${LATEST_TAG} to ${APP_DIR}"

cd "${APP_DIR}"

# --- Step 4: Create data directory ---
mkdir -p data

# --- Step 5: Display configuration ---
echo ""
echo "  How is your display oriented?"
echo "  1) Portrait (default, rotated 90° clockwise)"
echo "  2) Portrait (rotated 90° counter-clockwise)"
echo "  3) Landscape (no rotation)"
echo "  4) Inverted (rotated 180°)"
echo ""
read -rp "  Display orientation [1]: " ORIENT_CHOICE
ORIENT_CHOICE="${ORIENT_CHOICE:-1}"

case "${ORIENT_CHOICE}" in
  2) WLR_TRANSFORM="270" ;;
  3) WLR_TRANSFORM=""     ;;
  4) WLR_TRANSFORM="180" ;;
  *) WLR_TRANSFORM="90"  ;;
esac

echo ""
echo "  Enter display resolution (e.g. 1920x1080, 2560x1440)"
echo "  Leave blank to use the display's preferred resolution."
echo ""
read -rp "  Resolution [auto]: " DISPLAY_RES

DISPLAY_MODE=""
if [ -n "${DISPLAY_RES}" ]; then
  DISPLAY_MODE="${DISPLAY_RES}"
  info "Display resolution set to ${DISPLAY_MODE}."
fi

# Save display config to kiosk.conf (consumed by kiosk-launcher.sh)
KIOSK_CONF="${APP_DIR}/data/kiosk.conf"
echo "DISPLAY_TRANSFORM=${WLR_TRANSFORM}" > "${KIOSK_CONF}"
echo "DISPLAY_MODE=${DISPLAY_MODE}" >> "${KIOSK_CONF}"
if [ -n "${WLR_TRANSFORM}" ]; then
  info "Display will be rotated ${WLR_TRANSFORM}° on boot."
fi

# Persist display settings into config.json so upgrades stay in sync.
# upgrade.sh regenerates kiosk.conf from config.json, so without this
# the user's install-time choices would be lost on the first upgrade.
CONFIG_FILE="${APP_DIR}/data/config.json"
node -e "
const fs = require('fs');
const p = '${CONFIG_FILE}';
let c;
try { c = JSON.parse(fs.readFileSync(p, 'utf-8')); } catch {
  c = {
    version: 1,
    settings: {
      rotationIntervalMs: 30000,
      displayWidth: 1080, displayHeight: 1920, displayTransform: '90',
      latitude: 0, longitude: 0,
      weather: { provider: 'weatherapi', latitude: 0, longitude: 0, units: 'imperial' },
      calendar: { googleCalendarId: '', googleCalendarIds: [], maxEvents: 10, daysAhead: 7 }
    },
    screens: [{ id: 'default', name: 'Screen 1', backgroundImage: '', modules: [] }]
  };
}
const s = c.settings = c.settings || {};
const t = '${WLR_TRANSFORM}';
s.displayTransform = t || 'normal';
const mode = '${DISPLAY_MODE}';
if (mode) {
  const [a, b] = mode.split('x').map(Number);
  if (a && b) {
    if (t === '90' || t === '270') {
      s.displayWidth = Math.min(a, b);
      s.displayHeight = Math.max(a, b);
    } else {
      s.displayWidth = a;
      s.displayHeight = b;
    }
  }
}
fs.writeFileSync(p, JSON.stringify(c, null, 2) + '\n');
"
info "Display settings saved to config.json."

# --- Step 6: System setup (services, kiosk, boot target, autologin) ---
info "Configuring system..."
bash "${APP_DIR}/scripts/upgrade.sh" setup-system

# --- Done ---
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Installation complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "  Display URL:  http://$(hostname -I | awk '{print $1}'):3000/display"
echo "  Editor URL:   http://$(hostname -I | awk '{print $1}'):3000/editor"
echo ""
echo "  Service:      home-screens (Next.js server)"
echo "  Kiosk:        cage (launches automatically on TTY1)"
echo "  App:          ${APP_DIR}"
echo "  Data:         ${APP_DIR}/data/config.json"
echo ""
echo "  Commands:"
echo "    sudo systemctl start home-screens    # start server"
echo "    sudo systemctl status home-screens   # check status"
echo "    journalctl -u home-screens -f        # view logs"
echo ""
echo "  Reboot to start the kiosk display:"
echo "    sudo reboot"
echo ""
