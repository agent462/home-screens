# Getting Started

## Prerequisites

- Node.js 20+
- npm

## Installation

```bash
git clone <repo-url>
cd home-screens
npm install
```

## Environment Variables

Copy the example file and fill in your API keys:

```bash
cp .env.local.example .env.local
```

| Variable | Description | Required |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (for calendar) | For calendar |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | For calendar |
| `OPENWEATHERMAP_API_KEY` | OpenWeatherMap API key | Optional |
| `WEATHERAPI_KEY` | WeatherAPI.com API key | Optional |
| `GOOGLE_MAPS_API_KEY` | Google Routes API key (for traffic module) | For traffic |
| `TOMTOM_API_KEY` | TomTom Routing API key (traffic fallback) | For traffic |

Weather API keys can also be configured through the editor UI under Settings > Weather. Editor config takes priority over environment variables.

## Running

```bash
# Development
npm run dev

# Production
npm run build
npm run start
```

Then visit:

- **Editor** — `http://localhost:3000/editor` to configure your screens
- **Display** — `http://localhost:3000/display` for the fullscreen kiosk view

## Google Calendar Setup

Google Calendar uses **OAuth 2.0 Device Flow**, which means you can authorize from any device on your network — no redirect URI or public domain required. This is ideal for headless displays.

1. Go to [Google Cloud Console](https://console.cloud.google.com) > **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth Client ID**
3. Application type: **TVs and Limited Input devices**
4. Name it anything (e.g. "Home Screen Display")
5. Copy the **Client ID** and **Client Secret** into your `.env.local`
6. Enable the **Google Calendar API** at APIs & Services > Library
7. In the editor, go to **Settings > Google Calendar > Sign in with Google**
8. You'll see a code and a link to `google.com/device` — enter the code on your phone or computer and grant access

## Next Steps

- [Editor Guide](editor.md) — learn how to build your screens
- [Modules Reference](modules.md) — see all 25 available modules
- [Raspberry Pi Deployment](raspberry-pi.md) — set up a dedicated kiosk display
