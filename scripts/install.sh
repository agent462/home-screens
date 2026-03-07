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

# --- Step 1: System packages ---
info "Updating system packages..."
sudo apt-get update -qq

info "Installing required packages..."
sudo apt-get install -y -qq git curl chromium xdotool unclutter

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

# --- Step 7: Systemd services ---
info "Setting up systemd services..."

sudo tee /etc/systemd/system/home-screens.service > /dev/null <<EOF
[Unit]
Description=Home Screens Next.js Server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${USER}
WorkingDirectory=${APP_DIR}
ExecStart=$(which npm) start
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF

sudo tee /etc/systemd/system/home-screens-kiosk.service > /dev/null <<EOF
[Unit]
Description=Home Screens Chromium Kiosk
After=home-screens.service graphical.target
Requires=home-screens.service
PartOf=home-screens.service

[Service]
Type=simple
User=${USER}
Environment=DISPLAY=:0
ExecStartPre=/bin/sleep 10
ExecStart=/usr/bin/chromium --kiosk --noerrdialogs --disable-infobars --no-first-run --disable-session-crashed-bubble --disable-translate --check-for-update-interval=31536000 http://localhost:3000/display
Restart=on-failure
RestartSec=5

[Install]
WantedBy=graphical.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable home-screens.service
sudo systemctl enable home-screens-kiosk.service

# --- Step 8: Disable screen blanking ---
info "Disabling screen blanking..."
if [ -f /etc/lightdm/lightdm.conf ]; then
  sudo sed -i 's/^#xserver-command=.*/xserver-command=X -s 0 -dpms/' /etc/lightdm/lightdm.conf
fi

sudo mkdir -p /etc/xdg/autostart
sudo tee /etc/xdg/autostart/disable-screensaver.desktop > /dev/null <<EOF
[Desktop Entry]
Type=Application
Name=Disable Screensaver
Exec=sh -c "xset s off; xset -dpms; xset s noblank"
Hidden=false
NoDisplay=true
EOF

# --- Step 9: Autologin ---
info "Configuring autologin..."
sudo mkdir -p /etc/systemd/system/getty@tty1.service.d
sudo tee /etc/systemd/system/getty@tty1.service.d/autologin.conf > /dev/null <<EOF
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin ${USER} --noclear %I \$TERM
EOF

# --- Done ---
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Installation complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "  Display URL:  http://$(hostname -I | awk '{print $1}'):3000/display"
echo "  Editor URL:   http://$(hostname -I | awk '{print $1}'):3000/editor"
echo ""
echo "  Services:     home-screens, home-screens-kiosk"
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
