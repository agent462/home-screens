#!/bin/bash
# Shrink a Raspberry Pi image using PiShrink via Podman
#
# Usage: ./shrink-image.sh <image-file>
#
# On macOS, volume mounts don't support loop device operations, so the image
# must be copied into the VM's local filesystem, shrunk there, then copied back.
# On Linux, runs directly in a privileged container with volume mount.

set -e

IMAGE_FILE="$1"

if [[ -z "$IMAGE_FILE" ]]; then
    echo "Usage: $0 <image-file>"
    echo "Example: $0 home-screens.img"
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

# Check if podman is available
if ! command -v podman &>/dev/null; then
    echo "Error: podman not found"
    echo "Install podman first"
    exit 1
fi

if [[ "$(uname)" == "Darwin" ]]; then
    # macOS: virtiofs mounts don't support loop device operations
    # Must copy image into VM's local filesystem
    echo ""
    echo "macOS detected — copying image into Podman VM"
    echo "(virtiofs mounts don't support loop devices)"
    echo ""

    if ! podman machine info &>/dev/null; then
        echo "Error: Podman machine is not running"
        echo "Start it with: podman machine start"
        exit 1
    fi

    VM_WORKDIR="/var/tmp/pishrink-$$"

    # Clean up VM work directory on exit (success or failure)
    cleanup_vm() {
        podman machine ssh "sudo rm -rf $VM_WORKDIR" 2>/dev/null || true
    }
    trap cleanup_vm EXIT

    # Check VM disk space
    VM_FREE=$(podman machine ssh "df / --output=avail -B1 | tail -1" 2>/dev/null || echo "0")
    IMAGE_SIZE=$(stat -f%z "$IMAGE_FILE" 2>/dev/null || stat -c%s "$IMAGE_FILE" 2>/dev/null)
    NEEDED=$((IMAGE_SIZE * 3 / 2))

    if [[ "$VM_FREE" -lt "$NEEDED" ]]; then
        echo "Warning: Podman VM may not have enough disk space"
        echo "  Available: $((VM_FREE / 1024 / 1024)) MB"
        echo "  Image size: $((IMAGE_SIZE / 1024 / 1024)) MB"
        echo "  Recommended: $((NEEDED / 1024 / 1024)) MB"
        echo ""
        read -p "Continue anyway? [y/N] " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi

    echo "Creating work directory in VM..."
    podman machine ssh "sudo mkdir -p $VM_WORKDIR && sudo chmod 777 $VM_WORKDIR"

    echo "Copying image to VM (this may take a while)..."
    podman machine ssh "cat > $VM_WORKDIR/$IMAGE_NAME" < "$IMAGE_FILE"

    echo "Running PiShrink in container..."
    podman machine ssh "podman run --rm --privileged \
        -v $VM_WORKDIR:$VM_WORKDIR \
        -w $VM_WORKDIR \
        docker.io/library/debian:bookworm-slim \
        bash -c 'apt-get update && apt-get install -y parted dosfstools e2fsprogs wget udev && \
            wget -q https://raw.githubusercontent.com/Drewsif/PiShrink/master/pishrink.sh && \
            chmod +x pishrink.sh && \
            ./pishrink.sh \"$IMAGE_NAME\"'"

    echo "Copying shrunk image back..."
    SHRUNK_FILE="${IMAGE_FILE%.img}-shrunk.img"
    podman machine ssh "cat \"$VM_WORKDIR/$IMAGE_NAME\"" > "$SHRUNK_FILE"

    # VM cleanup handled by EXIT trap

    echo ""
    echo "Done!"
    echo "Original: $IMAGE_FILE ($(du -h "$IMAGE_FILE" | cut -f1))"
    echo "Shrunk:   $SHRUNK_FILE ($(du -h "$SHRUNK_FILE" | cut -f1))"

else
    # Linux: volume mounts work with loop devices
    echo "Running PiShrink in privileged container..."

    podman run --rm --privileged \
        -v "$IMAGE_DIR":/workdir:Z \
        -w /workdir \
        docker.io/library/debian:bookworm-slim \
        bash -c "
            apt-get update && apt-get install -y parted dosfstools e2fsprogs wget udev
            wget -q https://raw.githubusercontent.com/Drewsif/PiShrink/master/pishrink.sh
            chmod +x pishrink.sh
            ./pishrink.sh '$IMAGE_NAME'
        "

    echo ""
    echo "Done! Shrunk image: $IMAGE_FILE"
    echo "Size: $(du -h "$IMAGE_FILE" | cut -f1)"
fi
