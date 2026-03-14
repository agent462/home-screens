#!/bin/bash
# Upload a pre-built image to a GitHub release
#
# Usage: ./upload-image.sh <tag> <image-file>
# Example: ./upload-image.sh v1.0.0 home-screens-v1.0.0.img.xz
#
# Requires: gh CLI (https://cli.github.com)

set -e

REPO="agent462/home-screens"
TAG="$1"
IMAGE_FILE="$2"

if [[ -z "$TAG" ]] || [[ -z "$IMAGE_FILE" ]]; then
    echo "Usage: $0 <tag> <image-file>"
    echo ""
    echo "Examples:"
    echo "  $0 v1.0.0 home-screens-v1.0.0.img.xz"
    echo "  $0 v1.0.0 home-screens-v1.0.0.img.zip"
    exit 1
fi

if [[ ! -f "$IMAGE_FILE" ]]; then
    echo "Error: Image file not found: $IMAGE_FILE"
    exit 1
fi

if ! command -v gh &>/dev/null; then
    echo "Error: gh CLI not found"
    echo "Install it: https://cli.github.com"
    exit 1
fi

IMAGE_SIZE=$(du -h "$IMAGE_FILE" | cut -f1)
echo "Uploading to release ${TAG}..."
echo "  File: $IMAGE_FILE ($IMAGE_SIZE)"
echo "  Repo: $REPO"
echo ""

# Check that the release exists
if ! gh release view "$TAG" --repo "$REPO" &>/dev/null; then
    echo "Error: Release $TAG not found in $REPO"
    echo "Create it first by pushing the tag (GitHub Actions will create the release)."
    exit 1
fi

# Upload the image as an additional release asset
gh release upload "$TAG" "$IMAGE_FILE" --repo "$REPO" --clobber

echo ""
echo "Done! Image uploaded to:"
echo "  https://github.com/${REPO}/releases/tag/${TAG}"
