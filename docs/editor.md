# Editor Guide

The editor is the main interface for designing your display screens. Access it at `/editor`.

## Layout

The editor has four main areas:

- **Module Palette** (left sidebar) — browse and drag modules onto the canvas
- **Canvas** (center) — the visual representation of your screen at actual display resolution
- **Property Panel** (right sidebar) — configure the selected module's settings and appearance
- **Screen Tabs** (top) — manage multiple screens

## Adding Modules

1. Open the **Module Palette** on the left
2. Browse by category or use the search bar to find a module
3. Click and drag a module onto the canvas
4. Drop it where you want it — modules snap to a 20px grid

Categories in the palette are collapsible. Click a category header to expand or collapse it.

## Selecting & Moving Modules

- **Click** a module on the canvas to select it
- **Drag** a selected module to reposition it
- **Resize** by dragging the module's edges or corners
- Position and size can also be set precisely using the X, Y, W, H fields in the Property Panel

## Configuring Modules

Select a module to open its settings in the **Property Panel** on the right. The panel has two sections:

### Module Settings

Each module type has its own configuration options. For example:

- **Clock** — toggle 24-hour format, seconds, date display
- **Countdown** — add/remove events with labels and dates
- **To-Do** — add/edit/check off items
- **News** — set the RSS feed URL
- **Stock Ticker** — enter comma-separated stock symbols

See the [Modules Reference](modules.md) for all available options.

### Style Settings

Every module can be styled with:

- **Opacity** — fade the module (0–1 slider)
- **Border Radius** — round the corners
- **Padding** — add inner spacing
- **Background Color** — set the module's background (supports transparency via rgba)
- **Text Color** — set the text color
- **Font Family** — choose from available fonts
- **Font Size** — set the base font size
- **Backdrop Blur** — apply a frosted glass effect behind the module

## Managing Screens

The display can rotate through multiple screens automatically.

### Adding a Screen

Click the **+** button in the Screen Tabs to create a new screen. Each screen has its own set of modules and background.

### Renaming a Screen

Double-click a screen tab to rename it.

### Removing a Screen

Click the **x** button on a screen tab. You must have at least one screen.

### Screen Rotation

Set the rotation interval in **Settings > Display**. Screens cycle in order at this interval. The display view shows small indicator dots at the bottom.

## Backgrounds

Open the **Background Picker** to manage screen backgrounds.

### Upload a Background

1. Click the upload area or drag an image file onto it
2. Images are stored in `public/backgrounds/`
3. Maximum file size: 10 MB
4. Supported formats: JPEG, PNG, WebP, GIF

### Unsplash Integration

If you've set an Unsplash access key in Settings, you can:

- Browse and select from Unsplash photos
- Enable background rotation to automatically cycle through Unsplash images

### Per-Screen Backgrounds

Each screen can have its own background image. Select a screen tab, then choose a background.

## Global Settings

Open the **Settings Panel** to configure system-wide options:

### Integrations

The **Integrations** tab is where you configure all API keys and external service connections. Keys are stored in the config file — no `.env.local` needed.

- **OpenWeatherMap** — API key for weather, air quality, and UV data
- **WeatherAPI** — alternative weather provider API key
- **Pirate Weather** — Dark Sky replacement API key
- **Unsplash** — access key for background photo browsing
- **Todoist** — API token for task integration
- **TomTom** — API key for traffic data
- **Google Calendar** — OAuth device flow sign-in

### Weather

- **Provider** — choose OpenWeatherMap, WeatherAPI, or Pirate Weather
- **Location** — set latitude/longitude for weather data
- **Units** — metric or imperial

### Google Calendar

- **Sign In** — initiate the OAuth device flow
- **Calendar Selection** — choose which calendars to display
- **Max Events** — limit the number of events shown
- **Days Ahead** — how far ahead to look for events

### Display

- **Resolution Preset** — choose from standard resolutions (1080p portrait, 4K, landscape, etc.)
- **Display Transform** — rotate the output (for physically rotated screens)

### Sleep & Screensaver

- **Dim Schedule** — automatically dim the display during set hours
- **Dim Brightness** — how much to dim (0–100%)
- **Sleep Schedule** — fully blank the screen during set hours
- **Screensaver** — show a minimal clock during sleep

### Timezone

Set the timezone for all time-aware modules (clock, calendar, sunrise/sunset, etc.).

## Password Protection

The editor can be protected with a password to prevent unauthorized access. Set a password in **Settings > Security**. Once enabled, accessing the editor requires entering the password. The display view remains publicly accessible.

## System Panel

The **System Panel** provides maintenance and system management features:

- **Version** — current app version
- **Changelog** — recent release notes
- **Upgrade** — pull and install the latest version
- **Rebuild** — rebuild the production app without upgrading
- **Rollback** — revert to the previous version
- **Backup/Restore** — export and import your configuration
- **Logs** — view application logs
- **Power** — restart or shut down the Raspberry Pi from the UI

## Saving

Changes are saved automatically when you modify settings. The editor fetches and pushes configuration via the `/api/config` endpoint, which reads and writes `data/config.json`.

## Import & Export

- **Export** — download your current configuration as a JSON file
- **Import** — upload a previously exported JSON file to restore a configuration

This is useful for backing up before making major changes or transferring configurations between devices.
