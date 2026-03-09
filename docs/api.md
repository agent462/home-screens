# API Reference

All API routes are served under `/api/`. They act as server-side proxies to protect API keys and avoid CORS issues.

## Configuration

### GET /api/config

Returns the current screen configuration.

**Response:** `ScreenConfiguration` object (see [Configuration](configuration.md))

### PUT /api/config

Saves the screen configuration. Performs an atomic write (temp file + rename) to prevent corruption.

**Body:** `ScreenConfiguration` object

**Response:** `{ success: true }`

---

## Weather

### GET /api/weather

Fetches weather data from the configured provider.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `type` | string | `"both"` | `hourly`, `forecast`, or `both` |
| `provider` | string | from config | `openweathermap` or `weatherapi` |
| `lat` | number | from config | Latitude |
| `lon` | number | from config | Longitude |
| `units` | string | `"imperial"` | `metric` or `imperial` |

**Response:**
```json
{
  "hourly": [
    { "time": "2pm", "temp": 72, "icon": "sun", "precipitation": 0, "humidity": 45, "wind": 8, "feelsLike": 70 }
  ],
  "forecast": [
    { "day": "Mon", "date": "2026-03-09", "high": 75, "low": 55, "icon": "cloud-sun", "precipitation": 20, "humidity": 50, "wind": 12, "precipAmount": 0.1 }
  ]
}
```

---

## Calendar

### GET /api/calendar

Fetches events from Google Calendar. Requires OAuth to be configured.

| Parameter | Type | Description |
|---|---|---|
| `calendarIds` | string | Comma-separated calendar IDs |
| `timeMin` | string | ISO 8601 start time |
| `timeMax` | string | ISO 8601 end time |

**Response:**
```json
[
  {
    "id": "event-id",
    "summary": "Team Meeting",
    "start": "2026-03-08T10:00:00-06:00",
    "end": "2026-03-08T11:00:00-06:00",
    "location": "Room 42",
    "calendarColor": "#4285f4"
  }
]
```

### GET /api/calendars

Lists the authenticated user's Google Calendars.

**Response:**
```json
[
  { "id": "primary", "summary": "My Calendar", "backgroundColor": "#4285f4" }
]
```

---

## Google Auth

### GET /api/auth/google/device

Initiates the OAuth 2.0 device flow.

**Response:**
```json
{
  "verification_url": "https://www.google.com/device",
  "user_code": "ABCD-EFGH",
  "device_code": "...",
  "expires_in": 1800,
  "interval": 5
}
```

### GET /api/auth/google/status

Checks if Google OAuth is currently authenticated.

**Response:** `{ authenticated: true }` or `{ authenticated: false }`

### POST /api/auth/google/callback

Completes the device flow authentication.

**Body:** `{ device_code: string }`

---

## Data Feeds

### GET /api/stocks

Fetches stock prices from Yahoo Finance.

| Parameter | Type | Description |
|---|---|---|
| `symbols` | string | Comma-separated stock symbols (e.g. `AAPL,GOOGL`) |

**Response:**
```json
{
  "stocks": [
    { "symbol": "AAPL", "price": 178.52, "change": 2.31, "changePercent": 1.31 }
  ]
}
```

### GET /api/crypto

Fetches cryptocurrency prices from CoinGecko.

| Parameter | Type | Description |
|---|---|---|
| `ids` | string | Comma-separated CoinGecko IDs (e.g. `bitcoin,ethereum`) |

**Response:**
```json
{
  "prices": [
    { "id": "bitcoin", "name": "Bitcoin", "symbol": "BTC", "price": 67234.00, "change24h": -2.1 }
  ]
}
```

### GET /api/news

Parses an RSS feed and returns articles.

| Parameter | Type | Description |
|---|---|---|
| `feed` | string | RSS feed URL |

**Response:**
```json
{
  "items": [
    { "title": "Article Title", "link": "https://...", "pubDate": "2026-03-08T12:00:00Z" }
  ]
}
```

### GET /api/jokes

Returns a random dad joke.

**Response:**
```json
{ "joke": "Why don't skeletons fight each other? They don't have the guts." }
```

### GET /api/quote

Returns a daily inspirational quote from ZenQuotes.

**Response:**
```json
{ "quote": "The only way to do great work is to love what you do.", "author": "Steve Jobs" }
```

### GET /api/history

Returns historical events for today's date. Results are cached daily.

**Response:**
```json
{
  "events": [
    { "year": "1983", "text": "The first mobile phone call was made." }
  ]
}
```

---

## Traffic

### GET /api/traffic

Fetches estimated travel times. Supports Google Routes API or TomTom.

| Parameter | Type | Description |
|---|---|---|
| `routes` | string | JSON-encoded array of `{ label, origin, destination }` objects |

**Response:**
```json
{
  "routes": [
    { "label": "To Work", "duration": "25 mins", "distance": "18.3 mi", "trafficDelay": "5 mins" }
  ]
}
```

---

## Sports

### GET /api/sports

Fetches live scores from ESPN. Results are cached for 1 minute.

| Parameter | Type | Description |
|---|---|---|
| `leagues` | string | Comma-separated: `nfl`, `nba`, `mlb`, `nhl`, `mls`, `epl` |

**Response:**
```json
{
  "games": [
    {
      "league": "nba",
      "status": "in_progress",
      "homeTeam": "Lakers", "homeScore": 98,
      "awayTeam": "Celtics", "awayScore": 102,
      "period": "4th", "clock": "3:42"
    }
  ]
}
```

---

## Air Quality

### GET /api/air-quality

Returns air quality and UV data from OpenWeatherMap.

| Parameter | Type | Description |
|---|---|---|
| `lat` | number | Latitude (falls back to config) |
| `lon` | number | Longitude (falls back to config) |

**Response:**
```json
{
  "aqi": 2,
  "pm25": 12.5,
  "pm10": 18.3,
  "o3": 45.2,
  "no2": 15.8,
  "uv": 6.3
}
```

---

## Backgrounds

### GET /api/backgrounds

Lists all uploaded background images.

**Response:**
```json
["sunset.jpg", "mountains.png", "city-night.webp"]
```

### POST /api/backgrounds

Uploads a new background image.

**Body:** `multipart/form-data` with `file` field

**Constraints:**
- Max size: 10 MB
- Accepted types: JPEG, PNG, WebP, GIF

**Response:** `{ success: true, filename: "uploaded-name.jpg" }`

### DELETE /api/backgrounds

Deletes a background image.

| Parameter | Type | Description |
|---|---|---|
| `filename` | string | Name of the file to delete |

### GET /api/backgrounds/serve

Serves a background image file.

| Parameter | Type | Description |
|---|---|---|
| `file` | string | Filename to serve |

### GET /api/backgrounds/rotate

Returns a rotating background image (Unsplash integration).

| Parameter | Type | Description |
|---|---|---|
| `screenId` | string | Screen ID for per-screen rotation |

---

## Unsplash

### GET /api/unsplash

Search or list Unsplash photos. Requires an Unsplash access key in settings.

### GET /api/unsplash/random

Returns a random Unsplash photo with optional query filter.

---

## System

### GET /api/system/version

Returns the current application version.

**Response:** `{ version: "0.6.0" }`

### GET /api/system/build-id

Returns the current build hash. Used by the display to detect new deployments and auto-reload.

**Response:** `{ buildId: "abc123" }`

### GET /api/system/status

Returns system information.

### GET /api/system/changelog

Returns recent release notes.

### POST /api/system/upgrade

Triggers an upgrade to the latest version. Pulls from git, installs dependencies, and rebuilds.

### POST /api/system/rollback

Reverts to the previous version.

### GET /api/system/backups

Lists available configuration backups.

---

## Geocoding

### GET /api/geocode

Geocodes a location name to coordinates. Used by the weather location picker in settings.

| Parameter | Type | Description |
|---|---|---|
| `q` | string | Location query (e.g. "Minneapolis, MN") |
