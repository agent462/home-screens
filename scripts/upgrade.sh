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
    npm install --omit=dev 2>&1
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

  *)
    echo "{\"ok\":false,\"error\":\"Unknown action: ${action}\"}"
    exit 1
    ;;
esac
