#!/usr/bin/env bash
set -euo pipefail

# Release a new version: bumps package.json, commits, tags, and pushes.
#
# Usage:
#   ./scripts/release.sh patch    # 0.3.0 → 0.3.1
#   ./scripts/release.sh minor    # 0.3.0 → 0.4.0
#   ./scripts/release.sh major    # 0.3.0 → 1.0.0

BUMP="${1:-}"

if [[ -z "$BUMP" || ! "$BUMP" =~ ^(patch|minor|major)$ ]]; then
  echo "Usage: $0 <patch|minor|major>"
  exit 1
fi

# Ensure working tree is clean
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Error: uncommitted changes. Commit or stash first."
  exit 1
fi

# npm version bumps package.json, commits, and creates a v-prefixed tag
npm version "$BUMP" -m "release v%s"

# Push commit and tag
git push origin main --follow-tags

echo ""
echo "Released $(git describe --tags --abbrev=0). Deploy with:"
echo "  ./scripts/deploy.sh"
