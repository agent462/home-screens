#!/usr/bin/env bash
set -euo pipefail

# Home Screens - Raspberry Pi Install Script
# Installs everything needed to run the display on a fresh Raspberry Pi OS.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/<owner>/home-screens/main/scripts/install.sh | bash
#   -- or --
#   git clone https://github.com/<owner>/home-screens.git && cd home-screens && bash scripts/install.sh

APP_DIR="${HOME}/home-screens"
NODE_MAJOR=20

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[*]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[x]${NC} $1"; exit 1; }

# --- Preflight ---
if [ "$(uname -m)" != "aarch64" ] && [ "$(uname -m)" != "armv7l" ]; then
  warn "This doesn't look like a Raspberry Pi ($(uname -m)). Continuing anyway..."
fi

if [ "$(id -u)" -eq 0 ]; then
  error "Don't run this script as root. It will use sudo when needed."
fi

# --- Step 1: Bootstrap packages (git/curl needed before clone) ---
info "Installing bootstrap packages..."
sudo apt-get update -qq
sudo apt-get install -y -qq git curl

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

# --- Step 3: Clone or update repo ---
if [ -d "${APP_DIR}/.git" ]; then
  info "Repository already exists at ${APP_DIR}, pulling latest..."
  git -C "${APP_DIR}" pull --ff-only
elif [ -f "$(pwd)/package.json" ] && grep -q '"home-screens"' "$(pwd)/package.json" 2>/dev/null; then
  APP_DIR="$(pwd)"
  info "Running from existing checkout at ${APP_DIR}"
else
  info "Cloning repository to ${APP_DIR}..."
  echo ""
  echo "  Enter the git clone URL for your home-screens repo"
  echo "  (e.g. https://github.com/youruser/home-screens.git)"
  echo ""
  read -rp "  Clone URL: " CLONE_URL
  [ -z "${CLONE_URL}" ] && error "No clone URL provided."
  git clone "${CLONE_URL}" "${APP_DIR}"
fi

cd "${APP_DIR}"

# --- Step 4: Environment file ---
if [ ! -f .env.local ]; then
  warn "No .env.local found. Creating from example..."
  cp .env.local.example .env.local

  echo ""
  echo "  Configure your API keys in .env.local"
  echo "  Required for weather and calendar features."
  echo ""

  read -rp "  OpenWeatherMap API key (enter to skip): " OWM_KEY
  if [ -n "${OWM_KEY}" ]; then
    sed -i "s|OPENWEATHERMAP_API_KEY=.*|OPENWEATHERMAP_API_KEY=${OWM_KEY}|" .env.local
  fi

  read -rp "  WeatherAPI key (enter to skip): " WAPI_KEY
  if [ -n "${WAPI_KEY}" ]; then
    sed -i "s|WEATHERAPI_KEY=.*|WEATHERAPI_KEY=${WAPI_KEY}|" .env.local
  fi

  read -rp "  Google Client ID (enter to skip): " GCID
  if [ -n "${GCID}" ]; then
    sed -i "s|GOOGLE_CLIENT_ID=.*|GOOGLE_CLIENT_ID=${GCID}|" .env.local
  fi

  read -rp "  Google Client Secret (enter to skip): " GSEC
  if [ -n "${GSEC}" ]; then
    sed -i "s|GOOGLE_CLIENT_SECRET=.*|GOOGLE_CLIENT_SECRET=${GSEC}|" .env.local
  fi

  # Set NEXTAUTH_URL to localhost (Google OAuth callback)
  sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=http://localhost:3000|" .env.local
  info "Set NEXTAUTH_URL to http://localhost:3000"
else
  info ".env.local already exists, skipping configuration."
fi

# --- Step 5: Install dependencies and build ---
info "Installing npm dependencies..."
npm install

info "Building Next.js app (this may take a few minutes on a Pi)..."
npm run build

# --- Step 6: Create data directory ---
mkdir -p data

# --- Step 7: Display configuration ---
echo ""
echo "  How is your display oriented?"
echo "  1) Landscape (default, no rotation)"
echo "  2) Portrait (rotated 90° clockwise)"
echo "  3) Portrait (rotated 90° counter-clockwise)"
echo "  4) Inverted (rotated 180°)"
echo ""
read -rp "  Display orientation [1]: " ORIENT_CHOICE
ORIENT_CHOICE="${ORIENT_CHOICE:-1}"

case "${ORIENT_CHOICE}" in
  2) WLR_TRANSFORM="90"  ;;
  3) WLR_TRANSFORM="270" ;;
  4) WLR_TRANSFORM="180" ;;
  *) WLR_TRANSFORM=""     ;;
esac

echo ""
echo "  Enter display resolution (e.g. 1920x1080, 2560x1440)"
echo "  Leave blank to use the display's preferred resolution."
echo ""
read -rp "  Resolution [auto]: " DISPLAY_RES

DISPLAY_MODE=""
if [ -n "${DISPLAY_RES}" ]; then
  # wlr-randr mode format: WxH (it picks the best refresh rate)
  DISPLAY_MODE="${DISPLAY_RES}"
  info "Display resolution set to ${DISPLAY_MODE}."
fi

# Save display config
KIOSK_CONF="${APP_DIR}/data/kiosk.conf"
echo "DISPLAY_TRANSFORM=${WLR_TRANSFORM}" > "${KIOSK_CONF}"
echo "DISPLAY_MODE=${DISPLAY_MODE}" >> "${KIOSK_CONF}"
if [ -n "${WLR_TRANSFORM}" ]; then
  info "Display will be rotated ${WLR_TRANSFORM}° on boot."
fi

# --- Step 8: System setup (services, kiosk, boot target, autologin) ---
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
echo "  Config:       ${APP_DIR}/.env.local"
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
