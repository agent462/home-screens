#!/bin/bash
# Shrink a Raspberry Pi image using PiShrink
#
# Usage: ./shrink-image.sh <image-file> [new-image-file]
#
# macOS: Uses PiShrink-macOS (native, no Docker/Podman needed)
#        Install: https://github.com/lisanet/PiShrink-macOS
# Linux: Uses PiShrink in a privileged Podman container

set -e

IMAGE_FILE="$1"
NEW_IMAGE="$2"

if [[ -z "$IMAGE_FILE" ]]; then
    echo "Usage: $0 <image-file> [new-image-file]"
    echo ""
    echo "Examples:"
    echo "  $0 home-screens.img                          # shrink in place"
    echo "  $0 home-screens.img home-screens-shrunk.img  # shrink to new file"
    exit 1
fi

if [[ ! -f "$IMAGE_FILE" ]]; then
    echo "Error: Image file not found: $IMAGE_FILE"
    exit 1
fi

# Get absolute path
IMAGE_FILE="$(cd "$(dirname "$IMAGE_FILE")" && pwd)/$(basename "$IMAGE_FILE")"
IMAGE_NAME="$(basename "$IMAGE_FILE")"
IMAGE_DIR="$(dirname "$IMAGE_FILE")"

echo "Shrinking image: $IMAGE_FILE"
echo "Image size: $(du -h "$IMAGE_FILE" | cut -f1)"

if [[ "$(uname)" == "Darwin" ]]; then
    # =========================================================================
    # macOS: Use PiShrink-macOS (native ext2/3/4 tools, no VM needed)
    # https://github.com/lisanet/PiShrink-macOS
    # =========================================================================
    if ! command -v pishrink &>/dev/null; then
        echo ""
        echo "Error: pishrink not found"
        echo ""
        echo "Install PiShrink-macOS:"
        echo "  git clone https://github.com/lisanet/PiShrink-macOS.git"
        echo "  cd PiShrink-macOS"
        echo "  make"
        echo "  sudo make install"
        exit 1
    fi

    echo ""
    if [[ -n "$NEW_IMAGE" ]]; then
        # Get absolute path for new image
        NEW_DIR="$(cd "$(dirname "$NEW_IMAGE")" 2>/dev/null && pwd || pwd)"
        NEW_IMAGE="${NEW_DIR}/$(basename "$NEW_IMAGE")"
        echo "Shrinking to: $NEW_IMAGE"
        pishrink "$IMAGE_FILE" "$NEW_IMAGE"
    else
        pishrink "$IMAGE_FILE"
    fi

    echo ""
    echo "Done!"
    if [[ -n "$NEW_IMAGE" ]]; then
        echo "Original: $IMAGE_FILE ($(du -h "$IMAGE_FILE" | cut -f1))"
        echo "Shrunk:   $NEW_IMAGE ($(du -h "$NEW_IMAGE" | cut -f1))"
    else
        echo "Shrunk: $IMAGE_FILE ($(du -h "$IMAGE_FILE" | cut -f1))"
    fi

else
    # =========================================================================
    # Linux: Use PiShrink in a privileged Podman/Docker container
    # =========================================================================
    CONTAINER_CMD=""
    if command -v podman &>/dev/null; then
        CONTAINER_CMD="podman"
    elif command -v docker &>/dev/null; then
        CONTAINER_CMD="docker"
    else
        echo "Error: podman or docker not found"
        exit 1
    fi

    SHRINK_ARGS="'$IMAGE_NAME'"
    if [[ -n "$NEW_IMAGE" ]]; then
        NEW_NAME="$(basename "$NEW_IMAGE")"
        SHRINK_ARGS="'$IMAGE_NAME' '$NEW_NAME'"
    fi

    echo "Running PiShrink in privileged container ($CONTAINER_CMD)..."

    $CONTAINER_CMD run --rm --privileged \
        -v "$IMAGE_DIR":/workdir:Z \
        -w /workdir \
        docker.io/library/debian:bookworm-slim \
        bash -c "
            set -e
            apt-get update && apt-get install -y parted dosfstools e2fsprogs wget udev
            wget -q https://raw.githubusercontent.com/Drewsif/PiShrink/master/pishrink.sh
            chmod +x pishrink.sh
            ./pishrink.sh $SHRINK_ARGS
        "

    echo ""
    echo "Done!"
    if [[ -n "$NEW_IMAGE" ]]; then
        # Move output to requested path if different from image dir
        NEW_DIR="$(cd "$(dirname "$NEW_IMAGE")" 2>/dev/null && pwd || pwd)"
        NEW_ABS="${NEW_DIR}/$(basename "$NEW_IMAGE")"
        if [[ "$IMAGE_DIR/$NEW_NAME" != "$NEW_ABS" ]]; then
            mv "$IMAGE_DIR/$NEW_NAME" "$NEW_ABS"
        fi
        echo "Original: $IMAGE_FILE ($(du -h "$IMAGE_FILE" | cut -f1))"
        echo "Shrunk:   $NEW_ABS ($(du -h "$NEW_ABS" | cut -f1))"
    else
        echo "Shrunk: $IMAGE_FILE ($(du -h "$IMAGE_FILE" | cut -f1))"
    fi
fi
