#!/usr/bin/env bash
set -euo pipefail

# Release a new version: bumps package.json, commits, tags, and pushes.
#
# Usage:
#   ./scripts/release.sh patch       # 0.3.0 → 0.3.1
#   ./scripts/release.sh minor       # 0.3.0 → 0.4.0
#   ./scripts/release.sh major       # 0.3.0 → 1.0.0
#   ./scripts/release.sh prepatch    # 0.3.0 → 0.3.1-rc.0
#   ./scripts/release.sh preminor    # 0.3.0 → 0.4.0-rc.0
#   ./scripts/release.sh premajor    # 0.3.0 → 1.0.0-rc.0
#   ./scripts/release.sh prerelease  # 0.4.0-rc.0 → 0.4.0-rc.1

BUMP="${1:-}"

if [[ -z "$BUMP" || ! "$BUMP" =~ ^(patch|minor|major|prepatch|preminor|premajor|prerelease)$ ]]; then
  echo "Usage: $0 <patch|minor|major|prepatch|preminor|premajor|prerelease>"
  exit 1
fi

# Ensure working tree is clean
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Error: uncommitted changes. Commit or stash first."
  exit 1
fi

# Pre-release bumps use --preid rc (e.g., 0.4.0-rc.0)
PRE_ARGS=()
if [[ "$BUMP" == pre* ]]; then
  PRE_ARGS=(--preid rc)
fi

# npm version bumps package.json, commits, and creates a v-prefixed tag
npm version "$BUMP" "${PRE_ARGS[@]}" -m "release v%s"

# Push commit and tag
git push origin main --follow-tags

TAG="$(git describe --tags --abbrev=0)"
echo ""
if [[ "$BUMP" == pre* ]]; then
  echo "Pre-released ${TAG}."
  echo "  Visible to devices on the pre-release update channel."
  echo "  Bump RC:      $0 prerelease"
  echo "  Promote:      $0 minor  (or patch/major)"
else
  echo "Released ${TAG}. Deploy with:"
  echo "  ./scripts/deploy.sh"
fi
