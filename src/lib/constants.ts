// Default display dimensions (portrait 1080p)
export const DEFAULT_DISPLAY_WIDTH = 1080;
export const DEFAULT_DISPLAY_HEIGHT = 1920;

// Display resolution presets
export const DISPLAY_PRESETS = [
  { label: 'Portrait 1080p (1080 x 1920)', width: 1080, height: 1920 },
  { label: 'Portrait 1440p (1440 x 2560)', width: 1440, height: 2560 },
  { label: 'Portrait 4K (2160 x 3840)', width: 2160, height: 3840 },
  { label: 'Landscape 720p (1280 x 720)', width: 1280, height: 720 },
  { label: 'Landscape 1080p (1920 x 1080)', width: 1920, height: 1080 },
  { label: 'Landscape 1440p (2560 x 1440)', width: 2560, height: 1440 },
  { label: 'Landscape 4K (3840 x 2160)', width: 3840, height: 2160 },
] as const;

// Display orientation presets (wlr-randr transform values)
export const DISPLAY_TRANSFORMS = [
  { label: 'Landscape (no rotation)', value: 'normal' },
  { label: 'Portrait (90° clockwise)', value: '90' },
  { label: 'Inverted Landscape (180°)', value: '180' },
  { label: 'Portrait (270° clockwise)', value: '270' },
] as const;

// Config file path
export const CONFIG_FILE_PATH = 'data/config.json';

// Backgrounds directory
export const BACKGROUNDS_DIR = 'public/backgrounds';

// Weather refresh interval (5 minutes)
export const WEATHER_REFRESH_MS = 5 * 60 * 1000;

// Calendar refresh interval (5 minutes)
export const CALENDAR_REFRESH_MS = 5 * 60 * 1000;


// Grid snap size (in display pixels)
export const GRID_SIZE = 20;

export function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

// Default module sizes
export const DEFAULT_MODULE_SIZES: Record<string, { w: number; h: number }> = {
  clock: { w: 400, h: 200 },
  calendar: { w: 500, h: 600 },
  weather: { w: 600, h: 300 },
  countdown: { w: 500, h: 500 },
  'dad-joke': { w: 500, h: 200 },
  text: { w: 400, h: 150 },
  image: { w: 400, h: 300 },
  quote: { w: 500, h: 200 },
  todo: { w: 350, h: 400 },
  'sticky-note': { w: 300, h: 250 },
  greeting: { w: 500, h: 150 },
  news: { w: 500, h: 400 },
  'stock-ticker': { w: 400, h: 300 },
  crypto: { w: 400, h: 250 },
  'word-of-day': { w: 450, h: 200 },
  history: { w: 500, h: 200 },
  'moon-phase': { w: 300, h: 350 },
  'sunrise-sunset': { w: 400, h: 200 },
  'photo-slideshow': { w: 500, h: 400 },
  'qr-code': { w: 300, h: 350 },
  'year-progress': { w: 400, h: 300 },
  traffic: { w: 450, h: 300 },
  sports: { w: 500, h: 300 },
  'air-quality': { w: 350, h: 250 },
  todoist: { w: 400, h: 550 },
  'rain-map': { w: 500, h: 500 },
  'multi-month': { w: 400, h: 700 },
  'garbage-day': { w: 350, h: 320 },
  standings: { w: 500, h: 500 },
  affirmations: { w: 500, h: 200 },
  date: { w: 400, h: 200 },
  iframe: { w: 500, h: 400 },
};
