# Raspberry Pi Deployment

Home Screens is designed to run as a dedicated kiosk display on a Raspberry Pi. The install script handles the full setup from a fresh Raspberry Pi OS installation.

## Requirements

- Raspberry Pi 4 or 5 (2 GB+ RAM recommended)
- Raspberry Pi OS (Bookworm or later)
- A display connected via HDMI
- Network connection (Ethernet or Wi-Fi)

## One-Command Install

```bash
git clone <repo-url> ~/home-screens
cd ~/home-screens
bash scripts/install.sh
```

The script handles everything:

1. **Node.js 20** — installs via NodeSource
2. **Chromium** — installs the browser for kiosk mode
3. **System dependencies** — required packages for building native modules
4. **npm install** — installs all dependencies
5. **Production build** — runs `npm run build`
6. **systemd services** — creates and enables two services:
   - `home-screens` — the Next.js production server
   - `home-screens-kiosk` — Chromium in fullscreen kiosk mode
7. **Screen blanking** — disables DPMS/screen saver to keep the display on
8. **Autologin** — configures automatic login for the kiosk user

## Post-Install

Reboot to start the kiosk:

```bash
sudo reboot
```

After reboot, the display should automatically show the fullscreen view. To configure your screens, visit `http://<pi-ip>:3000/editor` from another device on your network.

### Configuring API Keys

API keys are configured through the editor UI, not environment files. Open the editor and go to **Settings > Integrations** to enter your API keys for weather providers, Unsplash, Todoist, TomTom, and other services.

## Display Orientation

If your screen is mounted in portrait mode, you may need to rotate the display output. Use the display transform setting in the editor (Settings > Display), or run:

```bash
bash scripts/rotate-display.sh
```

The available transforms are: `normal`, `90`, `180`, `270`.

## Managing Services

```bash
# Start/stop the server
sudo systemctl start home-screens
sudo systemctl stop home-screens

# Check status
sudo systemctl status home-screens

# View logs (follow mode)
journalctl -u home-screens -f

# Restart everything
sudo systemctl restart home-screens
```

Stopping the `home-screens` service also stops the kiosk.

## Manual Start

To run without systemd (useful for debugging):

```bash
bash scripts/start-display.sh
```

This starts the Next.js server and opens Chromium in kiosk mode.

## Upgrading

You can upgrade from the editor's System Panel, or manually:

```bash
cd ~/home-screens
bash scripts/upgrade.sh
```

The upgrade process:

1. Pulls the latest code from git
2. Installs any new dependencies
3. Rebuilds the production app
4. Restarts the services

You can also trigger an upgrade via the API:

```bash
curl -X POST http://localhost:3000/api/system/upgrade
```

## Rolling Back

If an upgrade causes problems, roll back to the previous version:

- From the editor's **System Panel > Rollback**
- Or via the API: `curl -X POST http://localhost:3000/api/system/rollback`

## Troubleshooting

### Display is blank

1. Check the service is running: `sudo systemctl status home-screens`
2. Check logs: `journalctl -u home-screens -f`
3. Verify the app is accessible: `curl http://localhost:3000/display`
4. Check if the sleep schedule is active — disable it temporarily in settings

### Chromium won't start

1. Make sure you're logged in (autologin should handle this)
2. Check the kiosk service: `sudo systemctl status home-screens-kiosk`
3. Try starting manually: `bash scripts/start-display.sh`

### Screen keeps going black

Screen blanking may still be active. Disable it:

```bash
xset s off
xset -dpms
xset s nofade
```

The install script should have done this, but some Pi OS updates re-enable it.

### Can't reach the editor from another device

1. Find the Pi's IP: `hostname -I`
2. Make sure port 3000 is not blocked by a firewall
3. Access `http://<pi-ip>:3000/editor` from a browser on the same network

### High memory usage

If the Pi runs low on memory:

- Use a Pi with 4 GB+ RAM
- Close any other running applications
- Consider reducing the number of modules that make API calls
- Increase swap: `sudo dphys-swapfile swapoff && sudo sed -i 's/CONF_SWAPSIZE=.*/CONF_SWAPSIZE=1024/' /etc/dphys-swapfile && sudo dphys-swapfile setup && sudo dphys-swapfile swapon`
