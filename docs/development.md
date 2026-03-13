# Development Guide

## Project Structure

```
src/
  app/
    (display)/display/       # Fullscreen kiosk view
    (editor)/editor/         # Configuration editor
    api/                     # API routes (see API Routes section below)
  components/
    modules/                 # All 30 module components + ModuleWrapper
    display/                 # ScreenRotator, ScreenRenderer, SleepOverlay
    editor/                  # Canvas, palette, property panel, settings, backgrounds
    ui/                      # Shared UI primitives (Button, Slider, Toggle, ColorPicker)
  hooks/                     # Custom React hooks
  lib/                       # Core logic (config, weather, calendar, registry, etc.)
  stores/                    # Zustand state management
  types/                     # TypeScript type definitions
data/
  config.json                # Live configuration file
public/
  backgrounds/               # Uploaded background images
scripts/                     # Install, deploy, and management scripts
```

## Architecture

### Route Groups

The app uses Next.js route groups to separate concerns:

- `(display)` — no layout chrome, just the fullscreen display
- `(editor)` — includes toolbar, sidebars, and editor controls

### Module System

There are currently **30 modules** organized into 7 categories:

| Category | Modules |
|---|---|
| **Time & Date** | clock, calendar, countdown, year-progress, multi-month |
| **Weather & Environment** | weather, moon-phase, sunrise-sunset, air-quality, rain-map |
| **News & Finance** | news, stock-ticker, crypto, sports, standings |
| **Knowledge & Fun** | dad-joke, quote, word-of-day, history |
| **Personal** | todo, sticky-note, greeting, todoist, garbage-day, affirmations |
| **Media & Display** | text, image, photo-slideshow, qr-code |
| **Travel** | traffic |

The module system follows a registry pattern. Each module is a self-contained unit:

1. **Component** — a React component in `src/components/modules/`
2. **Type** — a `ModuleType` union member in `src/types/config.ts`
3. **Config interface** — module-specific settings in `src/types/config.ts`
4. **Registration** — an entry in `src/lib/module-registry.ts` (label, icon, category, defaults)
5. **Dynamic import** — lazy loading in `src/lib/module-components.ts`

```mermaid
flowchart TD
    A["1. React Component\nsrc/components/modules/MyModule.tsx"] --> B["2. ModuleType union\nsrc/types/config.ts"]
    B --> C["3. Config interface\nsrc/types/config.ts"]
    C --> D["4. Default size\nsrc/lib/constants.ts"]
    D --> E["5. Registry entry\nsrc/lib/module-registry.ts"]
    E --> F["6. Dynamic import\nsrc/lib/module-components.ts"]
    F --> G["7. Editor controls\nsrc/components/editor/PropertyPanel.tsx"]
    G -.->|optional| H["8. API route\nsrc/app/api/*/route.ts"]
```

### State Management

- **Editor** — Zustand store (`src/stores/editor-store.ts`) manages config, selection, and dirty state
- **Display** — server-fetched config with client-side polling (no Zustand needed)

### Data Flow

#### Editor Flow

```mermaid
flowchart LR
    User -->|interact| EditorCanvas
    EditorCanvas -->|dispatch actions| ZustandStore["Zustand Store"]
    ZustandStore -->|PUT /api/config| ConfigAPI["/api/config"]
    ConfigAPI -->|write| ConfigJSON["data/config.json"]
```

#### Display Flow

```mermaid
flowchart LR
    ConfigJSON["data/config.json"] -->|GET /api/config\nevery 3s| ScreenRotator
    ScreenRotator -->|active screen| ScreenRenderer
    ScreenRenderer -->|wraps each| ModuleWrapper
    ModuleWrapper -->|renders| Modules["Individual Modules"]
```

#### API Data Flow

```mermaid
flowchart LR
    Modules["Module Components"] -->|useFetchData hook| APIRoutes["API Routes\n/api/weather, /api/calendar, etc."]
    APIRoutes -->|fetch| External["External Services\nOpenWeatherMap, Google, ESPN, etc."]
```

The display polls `config.json` every 3 seconds, so changes made in the editor appear on the display within a few seconds.

### Weather Provider Abstraction

Weather data comes from a pluggable provider system in `src/lib/weather.ts`:

```mermaid
classDiagram
    class WeatherProvider {
        <<interface>>
        +getHourly(lat, lon, units) Promise~HourlyWeather[]~
        +getForecast(lat, lon, units) Promise~ForecastDay[]~
        +getMinutely(lat, lon, units)? Promise~MinutelyPrecip[]~
        +getAlerts(lat, lon, units)? Promise~WeatherAlert[]~
    }

    class OpenWeatherMapProvider {
        -apiKey: string
        +getHourly()
        +getForecast()
    }

    class WeatherAPIProvider {
        -apiKey: string
        +getHourly()
        +getForecast()
    }

    class PirateWeatherProvider {
        -apiKey: string
        +getHourly()
        +getForecast()
        +getMinutely()
        +getAlerts()
    }

    class NOAAProvider {
        +getHourly()
        +getForecast()
        +getAlerts()
    }

    class OpenMeteoProvider {
        +getHourly()
        +getForecast()
    }

    WeatherProvider <|.. OpenWeatherMapProvider
    WeatherProvider <|.. WeatherAPIProvider
    WeatherProvider <|.. PirateWeatherProvider
    WeatherProvider <|.. NOAAProvider
    WeatherProvider <|.. OpenMeteoProvider

    class createWeatherProvider {
        <<function>>
        +createWeatherProvider(provider, apiKey) WeatherProvider
    }

    createWeatherProvider ..> WeatherProvider : creates
```

Five implementations exist: `OpenWeatherMapProvider`, `WeatherAPIProvider`, `PirateWeatherProvider`, `NOAAProvider`, and `OpenMeteoProvider`. The factory function `createWeatherProvider(provider, apiKey)` instantiates the correct one. Pirate Weather (a Dark Sky replacement) additionally supports minutely precipitation data and weather alerts. NOAA uses the National Weather Service API — it's free and requires no API key, but is limited to US locations. Open-Meteo is free, requires no API key, and provides global coverage.

### API Routes

API routes live in `src/app/api/*/route.ts` and serve as server-side proxies for external services:

| Category | Routes | Purpose |
|---|---|---|
| **Auth** | `auth/login`, `auth/logout`, `auth/status`, `auth/password`, `auth/google` | Authentication and session management |
| **System** | `system/status`, `system/version`, `system/build-id`, `system/changelog`, `system/power`, `system/upgrade`, `system/rollback`, `system/backups` | Server management and deployment |
| **Config** | `config`, `secrets` | Read/write config and manage API keys |
| **Weather** | `weather`, `rain-map` | Weather data (5 providers) and rain radar tiles |
| **Calendar** | `calendar`, `calendars` | Google Calendar events and calendar list |
| **Data** | `jokes`, `quote`, `news`, `history`, `stocks`, `crypto`, `sports`, `standings`, `todoist`, `air-quality`, `traffic` | External data proxies |
| **Display** | `display/[action]` | Remote control: wake, sleep, brightness, navigation, profiles, alerts |
| **Utility** | `backgrounds`, `geocode`, `image-proxy`, `time`, `unsplash` | Background images, geocoding, image proxying, server time, Unsplash photos |

### Display Control

Remote control uses a command queue pattern where the editor (or any HTTP client) pushes commands and the display polls to execute them.

```mermaid
sequenceDiagram
    participant Client as Editor / HTTP Client
    participant API as /api/display/[action]
    participant Queue as Command Queue (in-memory)
    participant Display as Display (ScreenRotator)

    Note over Client,Display: Command Flow
    Client->>API: POST /api/display/wake
    API->>Queue: enqueueCommand("wake")
    Display->>API: GET /api/display/commands (polls)
    API->>Queue: drainCommands()
    Queue-->>API: [{type: "wake"}]
    API-->>Display: {commands: [{type: "wake"}]}
    Display->>Display: Execute command

    Note over Client,Display: Status Reporting
    Display->>API: POST /api/display/status
    API->>API: setDisplayStatus(status)
    Client->>API: GET /api/display/status
    API-->>Client: {screenIndex, screenName, displayState, ...}
```

### Auth System

An authentication layer (`src/lib/auth.ts`) protects the editor and API routes. Google OAuth device flow is used for Google Calendar integration via `auth/google`.

```mermaid
sequenceDiagram
    participant Browser
    participant API as API Routes
    participant Google as google.com/device

    Note over Browser,Google: Password Auth
    Browser->>API: POST /api/auth/login {password}
    API-->>Browser: Set session cookie

    Note over Browser,Google: Google OAuth Device Flow
    Browser->>API: POST /api/auth/google/device
    API-->>Browser: {user_code, verification_url}
    Browser->>Browser: Display code to user
    Browser->>Google: User enters code at google.com/device
    loop Poll until authorized
        Browser->>API: PUT /api/auth/google/device {device_code}
        API-->>Browser: {status: "pending"} or {status: "ok"}
    end
    API->>API: Store tokens on disk
```

### Profile & Schedule System

Profiles group screens together and can activate on a schedule. Individual modules also support per-module scheduling to show/hide by day and time.

```mermaid
flowchart TD
    subgraph Profile
        PID["id, name"]
        SIDs["screenIds[]"]
        PSched["schedule?\n(daysOfWeek, startTime, endTime, invert)"]
    end

    subgraph ModuleSchedule
        Days["daysOfWeek: number[]\n0=Sun ... 6=Sat"]
        Start["startTime: string\ne.g. '06:00'"]
        End["endTime: string\ne.g. '09:00'"]
        Invert["invert: boolean\nhide during window if true"]
    end

    subgraph ScreenRotator Resolution
        A{"activeProfile\noverride set?"} -->|yes| B["Use override profile screens"]
        A -->|no| C{"Scheduled profile\nmatches now?"}
        C -->|yes| D["Use first matching\nprofile's screens"]
        C -->|no| E["Use all screens"]
    end
```

## Adding a New Module

### 1. Create the component

```tsx
// src/components/modules/MyModule.tsx
'use client'

interface MyModuleProps {
  config: { myOption: string }
}

export default function MyModule({ config }: MyModuleProps) {
  return <div>{config.myOption}</div>
}
```

The component receives its `config` object as a prop. It may also receive `weather`, `calendar`, `settings`, or location props depending on the module type — check `ScreenRenderer.tsx` for the full prop-passing logic.

### 2. Add the type

In `src/types/config.ts`, add to the `ModuleType` union:

```typescript
export type ModuleType =
  | 'clock'
  | 'calendar'
  // ...
  | 'my-module'
```

And define the config interface:

```typescript
export interface MyModuleConfig {
  myOption: string
}
```

### 3. Add default size

In `src/lib/constants.ts`, add to `DEFAULT_MODULE_SIZES`:

```typescript
'my-module': { w: 400, h: 300 }
```

### 4. Register the module

In `src/lib/module-registry.ts`:

```typescript
import { Sparkles } from 'lucide-react'

registerModule({
  type: 'my-module',
  label: 'My Module',
  icon: Sparkles,
  category: 'Personal',
  defaultConfig: { myOption: 'Hello' },
  defaultSize: DEFAULT_MODULE_SIZES['my-module'],
  // defaultStyle: { fontSize: 26 },  // optional
})
```

### 5. Add the dynamic import

In `src/lib/module-components.ts`:

```typescript
'my-module': dynamic(() => import('@/components/modules/MyModule')),
```

### 6. Add editor controls

In `src/components/editor/PropertyPanel.tsx`, add a section for your module's config options:

```tsx
{module.type === 'my-module' && (
  <div>
    <label>My Option</label>
    <input
      value={module.config.myOption}
      onChange={(e) => updateModuleConfig({ myOption: e.target.value })}
    />
  </div>
)}
```

### 7. Add an API route (optional)

If your module needs external data, create a route:

```
src/app/api/my-data/route.ts
```

Then fetch it in your component using the `useFetchData` hook:

```tsx
const [data] = useFetchData('/api/my-data?param=value', 60000)
```

## Custom Hooks

| Hook | Purpose |
|---|---|
| `useFetchData(url, interval)` | Polls an API endpoint at a set interval |
| `useModuleConfig(type)` | Reads module-specific config from the editor store |
| `useRotatingIndex(length, interval)` | Cycles through an array index on a timer |
| `useScaledFontSize(base, ratio)` | Calculates responsive font sizes |
| `useSleepManager(sleep, screensaver)` | Manages display sleep/dim state |
| `useDisplayCommands()` | Polls for remote commands and reports display status |
| `useTZClock(timezone)` | Provides a live-updating `Date` for a given timezone |
| `useIdleCursor(seconds)` | Hides cursor after idle period, restores on mousemove |
| `useLiveConfig(screens, settings, profiles)` | Polls for config changes on the display |

## Testing

```bash
npm run test        # Run tests with Vitest
npm run lint        # Run ESLint
```

## Scripts

| Script | Description |
|---|---|
| `scripts/install.sh` | Full Raspberry Pi setup |
| `scripts/start-display.sh` | Manual server + kiosk start |
| `scripts/rotate-display.sh` | Change screen orientation |
| `scripts/deploy.sh` | Production deployment |
| `scripts/release.sh` | Version release process |
| `scripts/upgrade.sh` | Download, deploy, and restart |
