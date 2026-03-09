# Development Guide

## Project Structure

```
src/
  app/
    (display)/display/       # Fullscreen kiosk view
    (editor)/editor/         # Configuration editor
    api/                     # API routes (config, weather, calendar, etc.)
  components/
    modules/                 # All 25 module components + ModuleWrapper
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

The module system follows a registry pattern. Each module is a self-contained unit:

1. **Component** — a React component in `src/components/modules/`
2. **Type** — a `ModuleType` union member in `src/types/config.ts`
3. **Config interface** — module-specific settings in `src/types/config.ts`
4. **Registration** — an entry in `src/lib/module-registry.ts` (label, icon, category, defaults)
5. **Dynamic import** — lazy loading in `src/lib/module-components.ts`

### State Management

- **Editor** — Zustand store (`src/stores/editor-store.ts`) manages config, selection, and dirty state
- **Display** — server-fetched config with client-side polling (no Zustand needed)

### Data Flow

```
Editor:
  Zustand store → fetch/save → /api/config → data/config.json

Display:
  ScreenRotator (polls config) → ScreenRenderer (fetches weather/calendar) → Modules
```

The display polls `config.json` every 3 seconds, so changes made in the editor appear on the display within a few seconds.

### Weather Provider Abstraction

Weather data comes from a pluggable provider system in `src/lib/weather.ts`:

```typescript
interface WeatherProvider {
  getHourly(lat, lon, units): Promise<HourlyWeather[]>
  getForecast(lat, lon, units): Promise<ForecastDay[]>
}
```

Two implementations exist: `OpenWeatherMapProvider` and `WeatherAPIProvider`. The factory function `createWeatherProvider(provider, apiKey)` instantiates the correct one.

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

registry.set('my-module', {
  type: 'my-module',
  label: 'My Module',
  icon: Sparkles,
  category: 'Personal',
  defaultConfig: { myOption: 'Hello' },
  defaultSize: DEFAULT_MODULE_SIZES['my-module'],
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
const { data } = useFetchData('/api/my-data?param=value', 60000)
```

## Custom Hooks

| Hook | Purpose |
|---|---|
| `useFetchData(url, interval)` | Polls an API endpoint at a set interval |
| `useRotatingIndex(length, interval)` | Cycles through an array index on a timer |
| `useScaledFontSize(base, ratio)` | Calculates responsive font sizes |
| `useSleepManager(sleep, screensaver)` | Manages display sleep/dim state |

## Testing

```bash
npm run test        # Run tests with Vitest
npm run lint        # Run ESLint
```

## Scripts

| Script | Description |
|---|---|
| `scripts/install.sh` | Full Raspberry Pi setup |
| `scripts/setup-kiosk.sh` | Kiosk mode configuration only |
| `scripts/start-display.sh` | Manual server + kiosk start |
| `scripts/rotate-display.sh` | Change screen orientation |
| `scripts/deploy.sh` | Production deployment |
| `scripts/release.sh` | Version release process |
| `scripts/upgrade.sh` | Pull, build, and restart |
