#!/usr/bin/env bash
set -euo pipefail

# Home Screens Upgrade Script
# Called by the API to perform git-based upgrades.
#
# Usage: upgrade.sh <action> [args...]
#   upgrade.sh preflight              - Check if upgrade is possible
#   upgrade.sh backup                 - Backup config to data/backups/
#   upgrade.sh fetch                  - Fetch latest tags from remote
#   upgrade.sh checkout <tag>         - Checkout a specific version tag
#   upgrade.sh install                - Run npm install
#   upgrade.sh build                  - Run npm run build
#   upgrade.sh restart                - Restart the systemd service
#   upgrade.sh rollback <tag>         - Checkout previous tag (same as checkout)
#   upgrade.sh stash                  - Stash local changes
#   upgrade.sh stash-pop              - Pop stashed changes
#   upgrade.sh health-check           - Verify server is responding
#   upgrade.sh list-backups           - List config backups
#   upgrade.sh restore-backup <file>  - Restore a config backup
#   upgrade.sh setup-system            - Apply system config (services, kiosk, boot target)

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="${APP_DIR}/data/backups"
CONFIG_FILE="${APP_DIR}/data/config.json"
SERVICE_NAME="home-screens"
MAX_BACKUPS=20

cd "${APP_DIR}"

action="${1:-}"
shift || true

case "${action}" in

  preflight)
    errors=""

    # Check git
    if ! git rev-parse --is-inside-work-tree &>/dev/null; then
      errors="${errors}Not a git repository. "
    fi

    # Check disk space (need ~500MB for build)
    available_kb=$(df -k "${APP_DIR}" | tail -1 | awk '{print $4}')
    if [ "${available_kb}" -lt 512000 ]; then
      errors="${errors}Low disk space ($(( available_kb / 1024 ))MB available, need 500MB). "
    fi

    # Check for merge conflicts
    if git diff --name-only --diff-filter=U 2>/dev/null | grep -q .; then
      errors="${errors}Unresolved merge conflicts. "
    fi

    if [ -n "${errors}" ]; then
      echo "{\"ok\":false,\"error\":\"${errors}\"}"
    else
      dirty="false"
      if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
        dirty="true"
      fi
      echo "{\"ok\":true,\"dirty\":${dirty},\"diskMB\":$(( available_kb / 1024 ))}"
    fi
    ;;

  backup)
    mkdir -p "${BACKUP_DIR}"
    if [ -f "${CONFIG_FILE}" ]; then
      timestamp=$(date +%Y%m%d-%H%M%S)
      version=$(node -p "require('./package.json').version" 2>/dev/null || echo "unknown")
      backup_name="config-v${version}-${timestamp}.json"
      cp "${CONFIG_FILE}" "${BACKUP_DIR}/${backup_name}"

      # Prune old backups, keep latest MAX_BACKUPS
      # shellcheck disable=SC2012
      ls -1t "${BACKUP_DIR}"/config-*.json 2>/dev/null | tail -n +$(( MAX_BACKUPS + 1 )) | xargs -r rm -f

      echo "{\"ok\":true,\"file\":\"${backup_name}\"}"
    else
      echo "{\"ok\":true,\"file\":null}"
    fi
    ;;

  fetch)
    git fetch --tags --force origin 2>&1
    echo "{\"ok\":true}"
    ;;

  checkout)
    target="${1:-}"
    if [ -z "${target}" ]; then
      echo "{\"ok\":false,\"error\":\"No target tag specified\"}"
      exit 1
    fi
    git checkout "${target}" 2>&1
    echo "{\"ok\":true,\"target\":\"${target}\"}"
    ;;

  install)
    npm install 2>&1
    echo "{\"ok\":true}"
    ;;

  build)
    npm run build 2>&1
    echo "{\"ok\":true}"
    ;;

  restart)
    # Try systemctl first (production Pi), fall back gracefully
    if command -v systemctl &>/dev/null && systemctl is-active "${SERVICE_NAME}" &>/dev/null; then
      sudo systemctl restart "${SERVICE_NAME}" 2>&1
      echo "{\"ok\":true,\"method\":\"systemctl\"}"
    else
      echo "{\"ok\":true,\"method\":\"manual\",\"message\":\"Service not managed by systemd. Restart manually.\"}"
    fi
    ;;

  reload-browser)
    # Reload the kiosk browser page via Chrome DevTools Protocol.
    # Requires Chromium to be started with --remote-debugging-port=9222.
    # Falls back to killing and relaunching Chromium if CDP is not available.
    CDP_URL="http://localhost:9222"
    reloaded=false

    # Try CDP reload first (no flicker, instant)
    if tab_id=$(curl -sf "${CDP_URL}/json" 2>/dev/null \
        | python3 -c "import sys,json; tabs=json.load(sys.stdin); [print(t['id']) for t in tabs if '/display' in t.get('url','')]" 2>/dev/null \
        | head -1) && [ -n "${tab_id}" ]; then
      curl -sf "${CDP_URL}/json/reload/${tab_id}" > /dev/null 2>&1
      reloaded=true
      echo "{\"ok\":true,\"method\":\"cdp\"}"
    fi

    # Fallback: kill and relaunch Chromium
    if [ "${reloaded}" = false ]; then
      # Find the Wayland display for the running Chromium
      WAYLAND_DISPLAY=""
      CHROMIUM_PID=$(pgrep -f 'chromium.*kiosk' | head -1)
      if [ -n "${CHROMIUM_PID}" ]; then
        WAYLAND_DISPLAY=$(tr '\0' '\n' < "/proc/${CHROMIUM_PID}/environ" 2>/dev/null | grep '^WAYLAND_DISPLAY=' | cut -d= -f2)
      fi
      WAYLAND_DISPLAY="${WAYLAND_DISPLAY:-wayland-0}"

      pkill chromium 2>/dev/null || true
      sleep 2
      WAYLAND_DISPLAY="${WAYLAND_DISPLAY}" XDG_RUNTIME_DIR="/run/user/$(id -u)" \
        nohup chromium --kiosk --noerrdialogs --disable-infobars --no-first-run \
          --disable-session-crashed-bubble --disable-translate \
          --check-for-update-interval=31536000 --password-store=basic \
          --ozone-platform=wayland --remote-debugging-port=9222 \
          http://localhost:3000/display > /dev/null 2>&1 &
      echo "{\"ok\":true,\"method\":\"relaunch\"}"
    fi
    ;;

  rollback)
    # Same as checkout - alias for clarity
    target="${1:-}"
    if [ -z "${target}" ]; then
      echo "{\"ok\":false,\"error\":\"No target tag specified\"}"
      exit 1
    fi
    git checkout "${target}" 2>&1
    echo "{\"ok\":true,\"target\":\"${target}\"}"
    ;;

  stash)
    result=$(git stash push -m "home-screens-upgrade-$(date +%s)" 2>&1)
    if echo "${result}" | grep -q "No local changes"; then
      echo "{\"ok\":true,\"stashed\":false}"
    else
      echo "{\"ok\":true,\"stashed\":true}"
    fi
    ;;

  stash-pop)
    if git stash list 2>/dev/null | grep -q "home-screens-upgrade"; then
      git stash pop 2>&1
      echo "{\"ok\":true,\"popped\":true}"
    else
      echo "{\"ok\":true,\"popped\":false}"
    fi
    ;;

  health-check)
    port="${1:-3000}"
    max_attempts=30
    attempt=0
    while [ $attempt -lt $max_attempts ]; do
      if curl -sf "http://localhost:${port}/api/config" >/dev/null 2>&1; then
        echo "{\"ok\":true,\"attempts\":${attempt}}"
        exit 0
      fi
      sleep 2
      attempt=$(( attempt + 1 ))
    done
    echo "{\"ok\":false,\"error\":\"Server did not respond within 60 seconds\"}"
    ;;

  list-backups)
    mkdir -p "${BACKUP_DIR}"
    files="["
    first=true
    for f in $(ls -1t "${BACKUP_DIR}"/config-*.json 2>/dev/null); do
      name=$(basename "$f")
      size=$(wc -c < "$f" | tr -d ' ')
      modified=$(date -r "$f" +%Y-%m-%dT%H:%M:%S 2>/dev/null || stat -c %Y "$f" 2>/dev/null || echo "unknown")
      if [ "$first" = true ]; then
        first=false
      else
        files="${files},"
      fi
      files="${files}{\"name\":\"${name}\",\"size\":${size},\"modified\":\"${modified}\"}"
    done
    files="${files}]"
    echo "${files}"
    ;;

  restore-backup)
    backup_name="${1:-}"
    if [ -z "${backup_name}" ]; then
      echo "{\"ok\":false,\"error\":\"No backup file specified\"}"
      exit 1
    fi
    backup_path="${BACKUP_DIR}/${backup_name}"
    if [ ! -f "${backup_path}" ]; then
      echo "{\"ok\":false,\"error\":\"Backup file not found\"}"
      exit 1
    fi
    # Validate it's valid JSON
    if ! node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf-8'))" -- "${backup_path}" 2>/dev/null; then
      echo "{\"ok\":false,\"error\":\"Backup file is not valid JSON\"}"
      exit 1
    fi
    cp "${backup_path}" "${CONFIG_FILE}"
    echo "{\"ok\":true,\"restored\":\"${backup_name}\"}"
    ;;

  setup-system)
    # Idempotent system-level configuration for the kiosk.
    # Safe to run on every deploy/upgrade — only changes what's needed.
    changed=""

    # 0. Ensure required system packages are installed
    REQUIRED_PACKAGES="chromium cage xdotool unclutter wlr-randr fonts-noto-color-emoji"
    missing=""
    for pkg in ${REQUIRED_PACKAGES}; do
      if ! dpkg -s "${pkg}" &>/dev/null; then
        missing="${missing} ${pkg}"
      fi
    done
    if [ -n "${missing}" ]; then
      sudo apt-get update -qq
      sudo apt-get install -y -qq ${missing}
      changed="${changed}packages,"
    fi

    # 1. Ensure systemd services are current
    NPM_PATH=$(which npm 2>/dev/null || echo "/usr/bin/npm")
    SERVICE_FILE="/etc/systemd/system/home-screens.service"
    DESIRED_SERVICE="[Unit]
Description=Home Screens Next.js Server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${USER}
WorkingDirectory=${APP_DIR}
ExecStart=${NPM_PATH} start
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target"

    if [ ! -f "${SERVICE_FILE}" ] || [ "$(cat "${SERVICE_FILE}")" != "${DESIRED_SERVICE}" ]; then
      echo "${DESIRED_SERVICE}" | sudo tee "${SERVICE_FILE}" > /dev/null
      sudo systemctl daemon-reload
      sudo systemctl enable home-screens.service
      changed="${changed}service,"
    fi

    # 2. Boot to console (required for cage kiosk)
    CURRENT_DEFAULT=$(systemctl get-default 2>/dev/null || echo "unknown")
    if [ "${CURRENT_DEFAULT}" != "multi-user.target" ]; then
      sudo systemctl set-default multi-user.target
      changed="${changed}boot-target,"
    fi

    # 3. Disable display managers
    for dm in lightdm gdm3 sddm; do
      if systemctl is-enabled "${dm}" &>/dev/null; then
        sudo systemctl disable "${dm}"
        changed="${changed}${dm},"
      fi
    done

    # 4. Disable legacy kiosk service
    if systemctl is-enabled home-screens-kiosk &>/dev/null; then
      sudo systemctl disable home-screens-kiosk
      changed="${changed}legacy-kiosk,"
    fi

    # 5. Autologin on TTY1
    AUTOLOGIN_DIR="/etc/systemd/system/getty@tty1.service.d"
    AUTOLOGIN_CONF="${AUTOLOGIN_DIR}/autologin.conf"
    DESIRED_AUTOLOGIN="[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin ${USER} --noclear %I \$TERM"

    if [ ! -f "${AUTOLOGIN_CONF}" ] || [ "$(cat "${AUTOLOGIN_CONF}")" != "${DESIRED_AUTOLOGIN}" ]; then
      sudo mkdir -p "${AUTOLOGIN_DIR}"
      echo "${DESIRED_AUTOLOGIN}" | sudo tee "${AUTOLOGIN_CONF}" > /dev/null
      changed="${changed}autologin,"
    fi

    # 6. Kiosk launcher script
    LAUNCHER="${APP_DIR}/scripts/kiosk-launcher.sh"
    DESIRED_LAUNCHER='#!/usr/bin/env bash
# Launched inside cage — applies resolution, rotation, then starts Chromium.
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
KIOSK_CONF="${APP_DIR}/data/kiosk.conf"

# Load display config
DISPLAY_TRANSFORM=""
DISPLAY_MODE=""
[ -f "${KIOSK_CONF}" ] && source "${KIOSK_CONF}"

# Apply resolution and rotation in the background
if [ -n "${DISPLAY_MODE}" ] || [ -n "${DISPLAY_TRANSFORM}" ]; then
  OUTPUT=$(wlr-randr 2>/dev/null | head -1 | awk '"'"'{print $1}'"'"' || echo '"'"'HDMI-A-1'"'"')
  (
    sleep 1
    WLR_ARGS="--output ${OUTPUT}"
    [ -n "${DISPLAY_MODE}" ] && WLR_ARGS="${WLR_ARGS} --mode ${DISPLAY_MODE}"
    [ -n "${DISPLAY_TRANSFORM}" ] && WLR_ARGS="${WLR_ARGS} --transform ${DISPLAY_TRANSFORM}"
    wlr-randr ${WLR_ARGS}
  ) &
fi

# Launch Chromium (exec replaces this script)
# --remote-debugging-port enables programmatic page reload after deploys/upgrades
exec chromium --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --no-first-run \
  --disable-session-crashed-bubble \
  --disable-translate \
  --check-for-update-interval=31536000 \
  --password-store=basic \
  --ozone-platform=wayland \
  --remote-debugging-port=9222 \
  http://localhost:3000/display'

    if [ ! -f "${LAUNCHER}" ] || [ "$(cat "${LAUNCHER}")" != "${DESIRED_LAUNCHER}" ]; then
      echo "${DESIRED_LAUNCHER}" > "${LAUNCHER}"
      chmod +x "${LAUNCHER}"
      changed="${changed}launcher,"
    fi

    # 7. Cage auto-launch in .bash_profile
    PROFILE="${HOME}/.bash_profile"
    KIOSK_BLOCK="# --- Home Screens Kiosk ---
if [ \"\$(tty)\" = \"/dev/tty1\" ]; then
  exec cage -s -- ${APP_DIR}/scripts/kiosk-launcher.sh
fi
# --- End Kiosk ---"

    if ! grep -q "Home Screens Kiosk" "${PROFILE}" 2>/dev/null; then
      echo "${KIOSK_BLOCK}" >> "${PROFILE}"
      changed="${changed}bash-profile,"
    fi

    # Remove trailing comma
    changed="${changed%,}"
    if [ -n "${changed}" ]; then
      echo "{\"ok\":true,\"changed\":\"${changed}\"}"
    else
      echo "{\"ok\":true,\"changed\":null}"
    fi
    ;;

  *)
    echo "{\"ok\":false,\"error\":\"Unknown action: ${action}\"}"
    exit 1
    ;;
esac
