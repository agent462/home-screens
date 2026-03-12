#!/usr/bin/env bash
set -euo pipefail

# Home Screens - Raspberry Pi OS Lite Install Script
# Installs extra packages needed when no desktop environment is present.
# For standard Pi OS with Desktop, use install.sh instead.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec bash "${SCRIPT_DIR}/install.sh" --lite
