# Getting Started

## Prerequisites

- Node.js 22+
- npm

## Installation

```bash
git clone <repo-url>
cd home-screens
npm install
```

## Configuration

All API keys and credentials are configured through the editor UI at **Settings > Integrations**. There is no need to manually edit environment files.

The following integrations can be configured through the editor:

| Integration | Description | Required |
|---|---|---|
| Google Calendar | OAuth client ID and secret for calendar sync | For calendar module |
| OpenWeatherMap | Weather data provider | Optional (one of five weather providers) |
| WeatherAPI | Weather data provider | Optional (one of five weather providers) |
| Pirate Weather | Weather data provider (Dark Sky replacement) | Optional (one of five weather providers) |
| NOAA | Free weather data (US only, no API key needed) | Optional (one of five weather providers) |
| Open-Meteo | Free weather data (global coverage, no API key needed) | Optional (one of five weather providers) |
| Google Maps | Google Routes API key for traffic module | For traffic module |
| TomTom | TomTom Routing API key (traffic fallback) | For traffic module |

## Running

```bash
# Development
npm run dev

# Production
npm run build
npm run start
```

Then visit:

- **Editor** -- `http://localhost:3000/editor` to configure your screens
- **Display** -- `http://localhost:3000/display` for the fullscreen kiosk view

## Password Protection

The editor supports optional password protection. Set a password in **Settings > General** to require authentication before accessing the editor.

## System Management

The editor includes a system management panel under **Settings > System** for upgrade, rollback, backups, and power control -- particularly useful when running on a Raspberry Pi.

## Google Calendar Setup

Google Calendar uses **OAuth 2.0 Device Flow**, which means you can authorize from any device on your network -- no redirect URI or public domain required. This is ideal for headless displays.

1. Go to [Google Cloud Console](https://console.cloud.google.com) > **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth Client ID**
3. Application type: **TVs and Limited Input devices**
4. Name it anything (e.g. "Home Screen Display")
5. Copy the **Client ID** and **Client Secret** into **Settings > Integrations** in the editor
6. Enable the **Google Calendar API** at APIs & Services > Library
7. In the editor, go to **Settings > Google Calendar > Sign in with Google**
8. You'll see a code and a link to `google.com/device` -- enter the code on your phone or computer and grant access

## Update Channel

By default, Home Screens uses the **Stable** channel for updates, which only includes tested releases.

You can switch to the **Dev** channel in **Settings > System** to get pre-release builds for testing new features before they are officially released. Dev builds may contain breaking changes or incomplete functionality. If you encounter issues, switch back to the Stable channel to return to the latest stable release.

## Next Steps

- [Editor Guide](editor.md) -- learn how to build your screens
- [Modules Reference](modules.md) -- see all 33 available modules
- [Raspberry Pi Deployment](raspberry-pi.md) -- set up a dedicated kiosk display
