# Configuration

Home Screens uses a single JSON file for all configuration: `data/config.json`. There is no database — the file is read and written directly by the API.

## File Location

```
data/config.json
```

The config is read via `GET /api/config` and written via `PUT /api/config`. Writes are atomic (temp file + rename) to prevent corruption during power loss.

## Schema

### Top Level

```typescript
{
  version: number           // Config schema version (for migrations)
  settings: GlobalSettings  // System-wide settings
  screens: Screen[]         // Array of display screens
}
```

### GlobalSettings

```typescript
{
  rotationIntervalMs: number    // Screen rotation interval (default: 30000)
  displayWidth: number          // Canvas width in pixels (default: 1080)
  displayHeight: number         // Canvas height in pixels (default: 1920)
  displayTransform: string      // Screen rotation: "normal", "90", "180", "270"

  latitude: number              // Global location latitude
  longitude: number             // Global location longitude
  locationName: string          // Human-readable location name
  timezone: string              // IANA timezone (e.g. "America/Chicago")

  weather: {
    provider: string            // "openweathermap" or "weatherapi"
    apiKey: string              // Provider API key
    latitude: number            // Weather-specific latitude (overrides global)
    longitude: number           // Weather-specific longitude (overrides global)
    units: string               // "metric" or "imperial"
  }

  calendar: {
    googleCalendarId: string         // Primary calendar ID (legacy)
    googleCalendarIds: string[]      // Multiple calendar IDs
    maxEvents: number                // Max events to display
    daysAhead: number                // Days to look ahead
  }

  unsplashAccessKey: string     // Unsplash API key for background rotation

  sleep: {
    enabled: boolean
    dimAfterMinutes: number     // Auto-dim after inactivity
    sleepAfterMinutes: number   // Auto-sleep after inactivity
    dimBrightness: number       // Dim level (0-100)
    dimSchedule: {              // Scheduled dimming
      startTime: string         // "HH:mm" format
      endTime: string           // "HH:mm" format
    }
    schedule: {                 // Scheduled sleep
      startTime: string         // "HH:mm" format
      endTime: string           // "HH:mm" format
    }
  }

  screensaver: {
    enabled: boolean
    type: string                // Screensaver mode (e.g. "clock")
  }
}
```

### Screen

```typescript
{
  id: string                    // Unique ID (UUID)
  name: string                  // Display name (shown in editor tabs)
  backgroundImage: string       // Path to background image
  modules: ModuleInstance[]     // Modules on this screen
}
```

### ModuleInstance

```typescript
{
  id: string                    // Unique ID (UUID)
  type: ModuleType              // Module type (e.g. "clock", "weather")
  position: { x: number, y: number }   // Top-left position in pixels
  size: { w: number, h: number }       // Width and height in pixels
  zIndex: number                        // Stacking order
  config: Record<string, unknown>       // Module-specific configuration
  style: ModuleStyle                    // Visual styling
}
```

### ModuleStyle

```typescript
{
  opacity: number               // 0–1
  borderRadius: number          // Pixels
  padding: number               // Pixels
  backgroundColor: string      // CSS color (e.g. "rgba(0,0,0,0.4)")
  textColor: string             // CSS color (e.g. "#ffffff")
  fontFamily: string            // CSS font-family
  fontSize: number              // Base font size in pixels
  backdropBlur: number          // Backdrop blur in pixels
}
```

## Display Resolution Presets

| Preset | Width | Height |
|---|---|---|
| Portrait 1080p | 1080 | 1920 |
| Portrait 1440p | 1440 | 2560 |
| Portrait 4K | 2160 | 3840 |
| Landscape 720p | 1280 | 720 |
| Landscape 1080p | 1920 | 1080 |
| Landscape 1440p | 2560 | 1440 |
| Landscape 4K | 3840 | 2160 |

## Config Migrations

Config files include a `version` number. When the schema changes between releases, migrations in `src/lib/migrations/` automatically transform older configs to the current format on load.

## Backup & Restore

- **Export** from the editor's System Panel downloads the config as JSON
- **Import** replaces the current config with an uploaded JSON file
- Manual backups: copy `data/config.json` to a safe location

## Example

```json
{
  "version": 1,
  "settings": {
    "rotationIntervalMs": 30000,
    "displayWidth": 1080,
    "displayHeight": 1920,
    "latitude": 44.7133,
    "longitude": -93.4227,
    "timezone": "America/Chicago",
    "weather": {
      "provider": "weatherapi",
      "apiKey": "your-key-here",
      "latitude": 44.7133,
      "longitude": -93.4227,
      "units": "imperial"
    },
    "calendar": {
      "googleCalendarIds": ["primary"],
      "maxEvents": 10,
      "daysAhead": 7
    }
  },
  "screens": [
    {
      "id": "abc-123",
      "name": "Main",
      "backgroundImage": "/backgrounds/sunset.jpg",
      "modules": [
        {
          "id": "mod-1",
          "type": "clock",
          "position": { "x": 20, "y": 40 },
          "size": { "w": 1040, "h": 220 },
          "zIndex": 1,
          "config": {
            "format24h": false,
            "showSeconds": true,
            "showDate": true
          },
          "style": {
            "opacity": 1,
            "borderRadius": 12,
            "padding": 16,
            "backgroundColor": "rgba(0,0,0,0.4)",
            "textColor": "#ffffff",
            "fontFamily": "Inter, system-ui, sans-serif",
            "fontSize": 16,
            "backdropBlur": 12
          }
        }
      ]
    }
  ]
}
```
