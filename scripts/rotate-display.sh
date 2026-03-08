#!/usr/bin/env bash
set -euo pipefail

# Rotate the display on Raspberry Pi (Wayland/labwc).
#
# Usage:
#   bash scripts/rotate-display.sh          # interactive
#   bash scripts/rotate-display.sh 90       # rotate 90° clockwise (portrait)
#   bash scripts/rotate-display.sh 270      # rotate 270° (portrait, other way)
#   bash scripts/rotate-display.sh 180      # inverted
#   bash scripts/rotate-display.sh 0        # landscape (no rotation)

GREEN='\033[0;32m'
NC='\033[0m'
info() { echo -e "${GREEN}[*]${NC} $1"; }

# Detect the output name
OUTPUT=$(wlr-randr 2>/dev/null | head -1 | awk '{print $1}' || echo "HDMI-A-1")

if [ -n "${1:-}" ]; then
  ANGLE="$1"
else
  echo ""
  echo "  Current output: ${OUTPUT}"
  echo ""
  echo "  Select rotation:"
  echo "  0)   Landscape (no rotation)"
  echo "  90)  Portrait (90° clockwise)"
  echo "  180) Inverted (180°)"
  echo "  270) Portrait (90° counter-clockwise)"
  echo ""
  read -rp "  Rotation [0]: " ANGLE
  ANGLE="${ANGLE:-0}"
fi

if [ "${ANGLE}" = "0" ]; then
  wlr-randr --output "${OUTPUT}" --transform normal
  info "Display set to landscape (no rotation)."
else
  wlr-randr --output "${OUTPUT}" --transform "${ANGLE}"
  info "Display rotated ${ANGLE}°."
fi

# Persist in labwc autostart
AUTOSTART="${HOME}/.config/labwc/autostart"
if [ -f "${AUTOSTART}" ]; then
  # Remove any existing wlr-randr lines
  sed -i '/wlr-randr/d' "${AUTOSTART}"

  if [ "${ANGLE}" != "0" ]; then
    # Insert rotation before the chromium line
    sed -i "/chromium/i (sleep 2 && wlr-randr --output \"${OUTPUT}\" --transform ${ANGLE}) &" "${AUTOSTART}"
    info "Rotation persisted in ${AUTOSTART}."
  else
    info "Rotation removed from ${AUTOSTART}."
  fi
fi
