#!/usr/bin/env bash
set -euo pipefail

# Raspberry Pi Kiosk Setup for Home Screens
# Run as: sudo bash setup-kiosk.sh

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run as root: sudo bash $0"
  exit 1
fi

APP_DIR="/home/pi/home-screens"
USER="pi"

echo "==> Installing Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

echo "==> Installing Chromium browser and utilities..."
apt-get install -y chromium-browser xdotool unclutter

echo "==> Configuring autologin for pi user..."
mkdir -p /etc/systemd/system/getty@tty1.service.d
cat > /etc/systemd/system/getty@tty1.service.d/autologin.conf <<EOF
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin ${USER} --noclear %I \$TERM
EOF

echo "==> Disabling screen blanking and screensaver..."
if [ -f /etc/lightdm/lightdm.conf ]; then
  sed -i 's/^#xserver-command=.*/xserver-command=X -s 0 -dpms/' /etc/lightdm/lightdm.conf
fi
cat > /etc/xdg/autostart/disable-screensaver.desktop <<EOF
[Desktop Entry]
Type=Application
Name=Disable Screensaver
Exec=sh -c "xset s off; xset -dpms; xset s noblank"
Hidden=false
NoDisplay=true
EOF

echo "==> Installing project dependencies..."
cd "${APP_DIR}"
sudo -u "${USER}" npm install

echo "==> Creating systemd service for Next.js server..."
cat > /etc/systemd/system/home-screens.service <<EOF
[Unit]
Description=Home Screens Next.js Server
After=network.target

[Service]
Type=simple
User=${USER}
WorkingDirectory=${APP_DIR}
ExecStartPre=/usr/bin/npm run build
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF

echo "==> Creating systemd service for Chromium kiosk..."
cat > /etc/systemd/system/home-screens-kiosk.service <<EOF
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
ExecStart=/usr/bin/chromium-browser --kiosk --noerrdialogs --disable-infobars --no-first-run --disable-session-crashed-bubble --disable-translate --check-for-update-interval=31536000 http://localhost:3000/display
Restart=on-failure
RestartSec=5

[Install]
WantedBy=graphical.target
EOF

echo "==> Enabling services..."
systemctl daemon-reload
systemctl enable home-screens.service
systemctl enable home-screens-kiosk.service

echo "==> Setup complete! Reboot to start the kiosk display."
echo "    sudo reboot"
