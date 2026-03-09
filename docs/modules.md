# Modules Reference

Home Screens includes 25 built-in modules organized into 7 categories. Each module can be dragged onto the canvas from the module palette in the editor.

## Time & Date

### Clock

Displays the current time with optional date information.

| Option | Type | Default | Description |
|---|---|---|---|
| `format24h` | boolean | `false` | Use 24-hour time format |
| `showSeconds` | boolean | `true` | Display seconds |
| `showDate` | boolean | `true` | Show date below time |
| `dateFormat` | string | `"EEEE, MMMM d"` | Date format string (date-fns) |
| `showWeekNumber` | boolean | `false` | Display current week number |
| `showDayOfYear` | boolean | `false` | Display day of year (e.g. "Day 67 of 365") |

### Calendar

Shows upcoming events from Google Calendar.

| Option | Type | Default | Description |
|---|---|---|---|
| `daysToShow` | number | `3` | Number of days ahead to display |
| `showTime` | boolean | `true` | Show event times |
| `showLocation` | boolean | `false` | Show event locations |

Requires Google Calendar to be configured in Settings. Supports multiple calendars with color-coding.

### Countdown

Counts down to one or more future events with visual progress rings.

| Option | Type | Default | Description |
|---|---|---|---|
| `events` | array | `[]` | List of events, each with `label` and `date` |
| `showPastEvents` | boolean | `false` | Continue showing events after they pass |
| `scale` | number | `1` | Visual scale factor (0.5–4) |

### Year Progress

Visual progress bars showing how far through the current time periods you are.

| Option | Type | Default | Description |
|---|---|---|---|
| `showYear` | boolean | `true` | Show year progress |
| `showMonth` | boolean | `true` | Show month progress |
| `showWeek` | boolean | `true` | Show week progress |
| `showDay` | boolean | `true` | Show day progress |
| `showPercentage` | boolean | `true` | Show percentage labels |

---

## Weather & Environment

### Weather Hourly

Horizontal scrolling hourly forecast.

| Option | Type | Default | Description |
|---|---|---|---|
| `hoursToShow` | number | `8` | Number of hours to display |
| `showFeelsLike` | boolean | `false` | Show "feels like" temperature |
| `showPrecipitation` | boolean | `true` | Show precipitation chance |
| `showHumidity` | boolean | `false` | Show humidity percentage |
| `showWind` | boolean | `false` | Show wind speed |

### Weather Forecast

Multi-day weather forecast with high/low temperatures.

| Option | Type | Default | Description |
|---|---|---|---|
| `daysToShow` | number | `5` | Number of forecast days |
| `showHighLow` | boolean | `true` | Show high/low temperatures |
| `showPrecipitation` | boolean | `true` | Show precipitation chance |
| `showPrecipAmount` | boolean | `false` | Show precipitation amount |
| `showHumidity` | boolean | `false` | Show humidity |
| `showWind` | boolean | `false` | Show wind speed |

### Moon Phase

Current moon phase with visual representation.

| Option | Type | Default | Description |
|---|---|---|---|
| `showIllumination` | boolean | `true` | Show illumination percentage |
| `showMoonTimes` | boolean | `true` | Show moonrise/moonset times |

Uses the `suncalc` library for calculations based on your configured latitude/longitude.

### Sunrise & Sunset

Today's sunrise and sunset times with visual arc.

| Option | Type | Default | Description |
|---|---|---|---|
| `showDayLength` | boolean | `true` | Show total daylight hours |
| `showGoldenHour` | boolean | `true` | Show golden hour times |

### Air Quality

Air quality index, pollutant levels, and UV index.

| Option | Type | Default | Description |
|---|---|---|---|
| `showAQI` | boolean | `true` | Show air quality index |
| `showPollutants` | boolean | `true` | Show individual pollutant levels (PM2.5, PM10, O3, NO2) |
| `showUV` | boolean | `true` | Show UV index |
| `refreshIntervalMs` | number | `900000` | Refresh interval (15 min default) |

Requires an OpenWeatherMap API key.

---

## News & Finance

### News

Rotating RSS feed headlines.

| Option | Type | Default | Description |
|---|---|---|---|
| `feedUrl` | string | `""` | RSS feed URL |
| `refreshIntervalMs` | number | `300000` | How often to fetch new articles (5 min) |
| `rotateIntervalMs` | number | `10000` | How often to rotate headlines (10 sec) |

### Stock Ticker

Real-time stock prices from Yahoo Finance.

| Option | Type | Default | Description |
|---|---|---|---|
| `symbols` | string | `""` | Comma-separated stock symbols (e.g. `"AAPL,GOOGL,MSFT"`) |
| `refreshIntervalMs` | number | `300000` | Refresh interval (5 min) |
| `cardScale` | number | `1` | Visual scale factor |

### Crypto

Cryptocurrency prices from CoinGecko.

| Option | Type | Default | Description |
|---|---|---|---|
| `ids` | string | `""` | Comma-separated CoinGecko IDs (e.g. `"bitcoin,ethereum"`) |
| `refreshIntervalMs` | number | `300000` | Refresh interval (5 min) |
| `cardScale` | number | `1` | Visual scale factor |

### Sports Scores

Live scores from ESPN.

| Option | Type | Default | Description |
|---|---|---|---|
| `leagues` | array | `[]` | Leagues to show: `nfl`, `nba`, `mlb`, `nhl`, `mls`, `epl` |
| `refreshIntervalMs` | number | `60000` | Refresh interval (1 min) |

---

## Knowledge & Fun

### Dad Joke

Displays a random dad joke that refreshes periodically.

| Option | Type | Default | Description |
|---|---|---|---|
| `refreshIntervalMs` | number | `60000` | How often to fetch a new joke (1 min) |

### Quote

Daily inspirational quote from ZenQuotes.

| Option | Type | Default | Description |
|---|---|---|---|
| `refreshIntervalMs` | number | `300000` | Refresh interval (5 min) |

### Word of the Day

Displays a vocabulary word with definition and usage.

No configuration options. Rotates through a built-in word list.

### This Day in History

Historical events that happened on today's date.

| Option | Type | Default | Description |
|---|---|---|---|
| `refreshIntervalMs` | number | `3600000` | Data refresh interval (1 hour) |
| `rotationIntervalSec` | number | `10` | How often to rotate between events |

---

## Personal

### To-Do

A checklist with completable items.

| Option | Type | Default | Description |
|---|---|---|---|
| `title` | string | `"To-Do"` | List title |
| `items` | array | `[]` | Items with `id`, `text`, and `completed` fields |

Items can be added, edited, and checked off in the editor.

### Sticky Note

A colored note card for freeform text.

| Option | Type | Default | Description |
|---|---|---|---|
| `content` | string | `""` | Note text content |
| `noteColor` | string | `"#fef08a"` | Background color of the note |

### Greeting

Displays a time-aware greeting (Good morning/afternoon/evening).

| Option | Type | Default | Description |
|---|---|---|---|
| `name` | string | `""` | Name to greet (e.g. "Good morning, Bryan") |

---

## Media & Display

### Text

Static text block with alignment control.

| Option | Type | Default | Description |
|---|---|---|---|
| `content` | string | `""` | Text content |
| `alignment` | string | `"left"` | Text alignment: `left`, `center`, or `right` |

### Image

Displays a static image.

| Option | Type | Default | Description |
|---|---|---|---|
| `src` | string | `""` | Image URL or path |
| `objectFit` | string | `"cover"` | How the image fills the container: `cover`, `contain`, or `fill` |
| `alt` | string | `""` | Alt text |

### Photo Slideshow

Rotates through images from a directory.

| Option | Type | Default | Description |
|---|---|---|---|
| `directory` | string | `""` | Directory name inside `public/backgrounds/` |
| `intervalMs` | number | `30000` | Time between transitions (30 sec) |
| `transition` | string | `"fade"` | Transition effect: `fade` or `none` |
| `objectFit` | string | `"cover"` | Image fit mode |

### QR Code

Generates a QR code from any text or URL.

| Option | Type | Default | Description |
|---|---|---|---|
| `data` | string | `""` | Content to encode |
| `label` | string | `""` | Label text below the code |
| `fgColor` | string | `"#ffffff"` | Foreground color |
| `bgColor` | string | `"transparent"` | Background color |

---

## Travel

### Traffic / Commute

Shows estimated travel times for configured routes.

| Option | Type | Default | Description |
|---|---|---|---|
| `routes` | array | `[]` | Routes, each with `label`, `origin`, and `destination` |
| `refreshIntervalMs` | number | `300000` | Refresh interval (5 min) |

Supports Google Routes API or TomTom as providers. Origins and destinations are address strings.

---

## Module Styling

Every module supports these style properties, configurable in the Property Panel:

| Property | Type | Default | Description |
|---|---|---|---|
| `opacity` | number | `1` | Module opacity (0–1) |
| `borderRadius` | number | `12` | Corner rounding in pixels |
| `padding` | number | `16` | Inner padding in pixels |
| `backgroundColor` | string | `"rgba(0,0,0,0.4)"` | Background color |
| `textColor` | string | `"#ffffff"` | Text color |
| `fontFamily` | string | `"Inter, system-ui, sans-serif"` | Font family |
| `fontSize` | number | `16` | Base font size in pixels |
| `backdropBlur` | number | `12` | Backdrop blur in pixels |
