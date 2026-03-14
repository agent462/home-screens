#!/bin/bash
# Stage 99: Finalize for Distribution
# Cleans up the system and prepares for image creation.
# Only runs when --img flag is passed to build-image.sh.

set -e

APP_DIR="/opt/home-screens/current"
APP_USER="hs"

log_info() {
    echo "[INFO] $1"
}

log_warn() {
    echo "[WARN] $1"
}

if [ "$BUILD_IMG" != "true" ]; then
    log_info "Skipping finalize (not building image)"
    exit 0
fi

log_info "Preparing image for distribution"

# ============================================================================
# Remove packages only needed for building (not runtime)
# ============================================================================
log_info "Removing build-only dependencies"

# Git (repo already cloned/downloaded and installed)
apt-get -y purge git 2>/dev/null || true

# Build essentials (only needed if HS_LOCAL was used)
apt-get -y purge build-essential gcc g++ make 2>/dev/null || true

# Clean up orphaned packages
apt-get -y autoremove --purge

# ============================================================================
# Clean package cache
# ============================================================================
log_info "Cleaning package cache"
apt-get clean
rm -rf /var/lib/apt/lists/*
rm -rf /var/cache/apt/archives/*.deb

# ============================================================================
# Remove development files and caches
# ============================================================================
log_info "Removing development files"
rm -rf /root/.npm
rm -rf /root/.cache
rm -rf /home/*/.npm
rm -rf /home/*/.cache
rm -rf /home/*/.ssh/id_rsa*
rm -rf /home/*/.ssh/known_hosts*
rm -rf /home/*/.ssh/authorized_keys

# ============================================================================
# Clear logs
# ============================================================================
log_info "Clearing logs"
find /var/log -type f -name "*.log" -delete 2>/dev/null || true
find /var/log -type f -name "*.gz" -delete 2>/dev/null || true
find /var/log -type f -name "*.1" -delete 2>/dev/null || true
journalctl --vacuum-time=1s 2>/dev/null || true

# ============================================================================
# Clear temp files
# ============================================================================
log_info "Clearing temp files"
rm -rf /tmp/*
rm -rf /var/tmp/*

# ============================================================================
# Clear SSH host keys (regenerated on first boot)
# ============================================================================
log_info "Removing SSH host keys (will regenerate on first boot)"
rm -f /etc/ssh/ssh_host_*

# ============================================================================
# Clear machine-id (regenerated on first boot)
# ============================================================================
log_info "Clearing machine-id"
truncate -s 0 /etc/machine-id
rm -f /var/lib/dbus/machine-id
ln -sf /etc/machine-id /var/lib/dbus/machine-id

# ============================================================================
# Clear shell history
# ============================================================================
log_info "Clearing bash history"
rm -f /root/.bash_history
rm -f /home/*/.bash_history
history -c 2>/dev/null || true

# ============================================================================
# Create first-boot service
# ============================================================================
log_info "Setting up first-boot initialization"

cat > /etc/systemd/system/home-screens-firstboot.service << EOF
[Unit]
Description=Home Screens First Boot Initialization
ConditionPathExists=!/opt/home-screens/.initialized
After=network.target
Before=home-screens.service

[Service]
Type=oneshot
ExecStart=/opt/home-screens/bin/firstboot.sh
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

mkdir -p /opt/home-screens/bin

cat > /opt/home-screens/bin/firstboot.sh << 'FBEOF'
#!/bin/bash
# Home Screens First Boot Initialization

set -e

APP_DIR="/opt/home-screens/current"
APP_USER="hs"
CONFIG_FILE="${APP_DIR}/data/config.json"

log() {
    echo "[Home Screens FirstBoot] $1"
    logger -t home-screens-firstboot "$1"
}

log "Starting first boot initialization"

# Regenerate SSH host keys
if [ ! -f /etc/ssh/ssh_host_rsa_key ]; then
    log "Regenerating SSH host keys"
    dpkg-reconfigure openssh-server
fi

# Regenerate machine-id (empty file triggers systemd auto-regeneration,
# but we also call setup explicitly as a belt-and-suspenders approach)
if [ ! -s /etc/machine-id ]; then
    log "Regenerating machine-id"
    systemd-machine-id-setup
fi

# Expand filesystem to fill SD card (immediate, no reboot needed)
ROOT_PART=$(findmnt -n -o SOURCE / 2>/dev/null || echo "")
ROOT_DEV=$(lsblk -no PKNAME "$ROOT_PART" 2>/dev/null || echo "")
if [ -n "$ROOT_DEV" ] && [ -n "$ROOT_PART" ]; then
    DISK_SIZE=$(lsblk -b -n -o SIZE "/dev/$ROOT_DEV" 2>/dev/null | head -1)
    PART_SIZE=$(lsblk -b -n -o SIZE "$ROOT_PART" 2>/dev/null)
    if [ -n "$DISK_SIZE" ] && [ -n "$PART_SIZE" ]; then
        THRESHOLD=$((DISK_SIZE * 90 / 100))
        if [ "$PART_SIZE" -lt "$THRESHOLD" ]; then
            log "Expanding filesystem"
            PART_NUM=$(echo "$ROOT_PART" | grep -o '[0-9]*$')
            if ! growpart "/dev/$ROOT_DEV" "$PART_NUM" 2>/dev/null; then
                log "growpart failed — filesystem not expanded"
            elif ! resize2fs "$ROOT_PART" 2>/dev/null; then
                log "resize2fs failed — filesystem not expanded"
            fi
        fi
    fi
fi

# Auto-detect display resolution from DRM/EDID and update config.json
# The first mode listed is the display's preferred/native resolution.
NATIVE_RES=$(cat /sys/class/drm/card*-*/modes 2>/dev/null | head -1 || true)
if [ -n "${NATIVE_RES}" ] && [ -f "${CONFIG_FILE}" ] && command -v node &>/dev/null; then
    log "Detected display resolution: ${NATIVE_RES}"
    node -e "
      const fs = require('fs');
      const [configFile, native] = process.argv.slice(1);
      try {
        const c = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
        const s = c.settings = c.settings || {};
        const [rawW, rawH] = native.split('x').map(Number);
        if (rawW && rawH) {
          const t = s.displayTransform || '90';
          if (t === '90' || t === '270') {
            s.displayWidth = Math.min(rawW, rawH);
            s.displayHeight = Math.max(rawW, rawH);
          } else {
            s.displayWidth = rawW;
            s.displayHeight = rawH;
          }
          fs.writeFileSync(configFile, JSON.stringify(c, null, 2) + '\n');
        }
      } catch (e) {
        // Non-fatal — editor will show default 1080x1920
      }
    " -- "${CONFIG_FILE}" "${NATIVE_RES}"

    # Regenerate kiosk.conf with the detected resolution
    if [ -f "${APP_DIR}/scripts/upgrade.sh" ]; then
        if USER="${APP_USER}" HOME="/home/${APP_USER}" \
            bash "${APP_DIR}/scripts/upgrade.sh" setup-system 2>/dev/null; then
            log "Updated config.json with detected display dimensions"
        else
            log "setup-system failed — display config may need manual update via editor"
        fi
    fi
else
    log "No display detected or node not available — using defaults (1080x1920)"
fi

# Mark first boot as complete — only after all required work succeeds.
# The systemd unit uses ConditionPathExists to skip on subsequent boots.
touch /opt/home-screens/.initialized
log "First boot initialization complete"
FBEOF

chmod +x /opt/home-screens/bin/firstboot.sh
systemctl enable home-screens-firstboot.service

# ============================================================================
# Prepare filesystem for imaging
# ============================================================================
log_info "Preparing filesystem for imaging"

# Flush and vacuum journal
journalctl --flush --rotate 2>/dev/null || true
journalctl --vacuum-time=1s 2>/dev/null || true

# Trim filesystem
if command -v fstrim &> /dev/null; then
    fstrim -v / 2>/dev/null || true
    log_info "  Filesystem trimmed"
fi

# Zero free space for better image compression
log_info "Zeroing free space (improves compression, may take a few minutes)..."
dd if=/dev/zero of=/zero.fill bs=1M 2>/dev/null || true
rm -f /zero.fill
log_info "  Free space zeroed"

# Sync all pending writes
sync

# ============================================================================
# Final verification
# ============================================================================
log_info "Verifying installation before finalization"

VERIFY_OK=true

if [ ! -f "${APP_DIR}/server.js" ]; then
    log_warn "Warning: server.js not found"
    VERIFY_OK=false
fi

if [ ! -d "${APP_DIR}/.next" ]; then
    log_warn "Warning: .next build output not found"
    VERIFY_OK=false
fi

if [ ! -f /etc/systemd/system/home-screens.service ]; then
    log_warn "Warning: systemd service not installed"
    VERIFY_OK=false
fi

if [ "$VERIFY_OK" = "true" ]; then
    log_info "All verifications passed"
else
    log_warn "Some verifications failed — image may not work correctly"
    exit 1
fi

# ============================================================================
# Done
# ============================================================================
log_info "Image preparation complete"
echo ""
echo "=============================================="
echo "NEXT STEPS:"
echo "=============================================="
echo ""
echo "1. Shutdown the Pi:"
echo "   sudo shutdown -h now"
echo ""
echo "2. Remove SD card and insert into a Linux or macOS computer"
echo ""
echo "3. Create the image:"
echo "   Linux:  sudo dd if=/dev/sdX of=home-screens.img bs=4M status=progress"
echo "   macOS:  diskutil unmountDisk /dev/diskN"
echo "           sudo dd if=/dev/rdiskN of=home-screens.img bs=4m status=progress"
echo ""
echo "4. Shrink the image:"
echo "   ./shrink-image.sh home-screens.img"
echo ""
echo "5. Compress for distribution:"
echo "   xz -9 -T0 home-screens.img"
echo ""
echo "6. Upload to GitHub release:"
echo "   ./upload-image.sh v1.0.0 home-screens.img.xz"
echo ""
echo "=============================================="
