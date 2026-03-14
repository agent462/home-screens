#!/bin/bash
# Stage 05: System Configuration
# Applies OS-level optimizations for production kiosk use.
#
# NOTE: Service configs (systemd, kiosk, Plymouth, autologin) are handled
# by upgrade.sh setup-system in stage 04. This script only handles
# OS-level tuning that setup-system doesn't cover.

set -e

log_info() {
    echo "[INFO] $1"
}

log_warn() {
    echo "[WARN] $1"
}

log_info "Applying OS-level optimizations for production"

# ============================================================================
# Systemd Journal — reduce disk writes and size
# ============================================================================
log_info "Configuring systemd journal (volatile, 16MB max)"
mkdir -p /etc/systemd/journald.conf.d
cat > /etc/systemd/journald.conf.d/home-screens.conf << 'EOF'
[Journal]
# Use volatile storage (RAM) to reduce SD card writes
Storage=volatile
# Limit journal size
RuntimeMaxUse=16M
RuntimeMaxFileSize=4M
# Reduce sync frequency
SyncIntervalSec=5min
EOF

# ============================================================================
# Configure zram swap (compressed RAM swap — no SD card wear)
# Install zram BEFORE removing disk swap to avoid a no-swap state on failure.
# ============================================================================
log_info "Configuring zram swap"
if ! dpkg -l | grep -q zram-tools; then
    apt-get -y install --no-install-recommends zram-tools
fi

if [[ -f /etc/default/zramswap ]]; then
    cat > /etc/default/zramswap << 'EOF'
# zram swap configuration for Home Screens
ALGO=zstd
PERCENT=25
PRIORITY=100
EOF
    cat > /etc/sysctl.d/99-home-screens-zram.conf << 'EOF'
# Zram swap tuning
vm.swappiness=10
vm.vfs_cache_pressure=50
EOF
    log_info "  Configured zram with zstd compression"
else
    log_warn "  zram-tools not available — keeping disk swap as fallback"
fi

# ============================================================================
# Disable disk-backed swap (only after zram is confirmed)
# ============================================================================
if dpkg -l | grep -q zram-tools; then
    log_info "Disabling disk-backed swap (zram is active)"
    if systemctl is-active --quiet dphys-swapfile 2>/dev/null; then
        systemctl stop dphys-swapfile
    fi
    if systemctl is-enabled --quiet dphys-swapfile 2>/dev/null; then
        systemctl disable dphys-swapfile
    fi
    apt-get -y purge dphys-swapfile 2>/dev/null || true
    rm -f /var/swap
fi

# ============================================================================
# Disable unnecessary services
# ============================================================================
log_info "Disabling unnecessary services"

SERVICES_DISABLE="
    apt-daily.service
    apt-daily-upgrade.service
    apt-daily.timer
    apt-daily-upgrade.timer
    man-db.timer
    dpkg-db-backup.timer
    rsyslog.service
    syslog.service
    bluetooth.service
    hciuart.service
    bthelper@.service
    ModemManager.service
    triggerhappy.service
    triggerhappy.socket
    systemd-journal-flush.service
    smartmontools.service
    smartd.service
    serial-getty@ttyAMA0.service
    serial-getty@ttyS0.service
"

for service in $SERVICES_DISABLE; do
    if systemctl list-unit-files | grep -q "^$service"; then
        systemctl disable "$service" 2>/dev/null || true
        systemctl stop "$service" 2>/dev/null || true
        log_info "  Disabled: $service"
    fi
done

# Mask services that might get re-enabled by dependencies
SERVICES_MASK="
    rsyslog.service
    ModemManager.service
    bluetooth.service
"

for service in $SERVICES_MASK; do
    if systemctl list-unit-files | grep -q "^$service"; then
        systemctl mask "$service" 2>/dev/null || true
        log_info "  Masked: $service"
    fi
done

# ============================================================================
# Storage-specific optimizations
# ============================================================================
log_info "Configuring storage-specific services"

ROOT_PART=$(findmnt -n -o SOURCE / 2>/dev/null || echo "")
ROOT_DISK=$(lsblk -no PKNAME "$ROOT_PART" 2>/dev/null || echo "")

if [[ "$ROOT_DISK" == mmcblk* ]]; then
    log_info "  Detected SD card storage ($ROOT_DISK)"
    systemctl disable fstrim.timer 2>/dev/null || true
    systemctl disable e2scrub_all.timer 2>/dev/null || true
    log_info "  Disabled fstrim/e2scrub (SD card)"
elif [[ -n "$ROOT_DISK" ]]; then
    log_info "  Detected non-SD storage ($ROOT_DISK)"
    systemctl enable fstrim.timer 2>/dev/null || true
    systemctl enable e2scrub_all.timer 2>/dev/null || true
    log_info "  Enabled fstrim/e2scrub (SSD/NVMe)"
else
    log_warn "  Could not detect storage type, defaulting to SD card behavior"
    systemctl disable fstrim.timer 2>/dev/null || true
    systemctl disable e2scrub_all.timer 2>/dev/null || true
fi

# ============================================================================
# File descriptor limits
# ============================================================================
log_info "Configuring file descriptor limits"
cat > /etc/security/limits.d/99-home-screens.conf << 'EOF'
# Home Screens file descriptor limits
hs soft nofile 65536
hs hard nofile 65536
EOF

# ============================================================================
# Configure tmpfs for volatile directories
# ============================================================================
log_info "Configuring tmpfs mounts"

if ! grep -q "# Home Screens tmpfs" /etc/fstab; then
    cat >> /etc/fstab << 'EOF'

# Home Screens tmpfs mounts — reduce SD card writes
tmpfs /tmp tmpfs defaults,noatime,nosuid,nodev,size=256M,mode=1777 0 0
tmpfs /var/tmp tmpfs defaults,noatime,nosuid,nodev,size=128M,mode=1777 0 0
EOF
    log_info "  Added tmpfs mounts to fstab"
else
    log_info "  tmpfs mounts already configured"
fi

# ============================================================================
# Boot optimization — disable wait for network
# ============================================================================
log_info "Configuring boot optimizations"

if systemctl is-enabled --quiet systemd-networkd-wait-online.service 2>/dev/null; then
    systemctl disable systemd-networkd-wait-online.service 2>/dev/null || true
    log_info "  Disabled systemd-networkd-wait-online"
fi

if systemctl is-enabled --quiet NetworkManager-wait-online.service 2>/dev/null; then
    systemctl disable NetworkManager-wait-online.service 2>/dev/null || true
    log_info "  Disabled NetworkManager-wait-online"
fi

# Use NetworkManager instead of dhcpcd (if both exist)
if systemctl is-enabled --quiet dhcpcd.service 2>/dev/null; then
    if systemctl is-enabled --quiet NetworkManager.service 2>/dev/null; then
        systemctl disable dhcpcd.service 2>/dev/null || true
        log_info "  Disabled dhcpcd (using NetworkManager)"
    fi
fi

# ============================================================================
# Apply sysctl settings
# ============================================================================
log_info "Applying sysctl settings"
sysctl --system > /dev/null 2>&1 || true

# ============================================================================
# Reload systemd and start service
# ============================================================================
log_info "Reloading systemd daemon"
systemctl daemon-reload

if systemctl is-enabled --quiet home-screens 2>/dev/null; then
    systemctl restart home-screens 2>/dev/null || log_warn "  home-screens failed to start (may need config)"
    log_info "  home-screens service restarted"
else
    log_warn "  home-screens service not enabled"
fi

log_info "System configuration complete"
