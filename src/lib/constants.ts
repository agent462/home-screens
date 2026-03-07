// Display dimensions (portrait TV)
export const DISPLAY_WIDTH = 1080;
export const DISPLAY_HEIGHT = 1920;


// Config file path
export const CONFIG_FILE_PATH = 'data/config.json';

// Backgrounds directory
export const BACKGROUNDS_DIR = 'public/backgrounds';

// Weather refresh interval (15 minutes)
export const WEATHER_REFRESH_MS = 15 * 60 * 1000;

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
  'weather-hourly': { w: 600, h: 250 },
  'weather-forecast': { w: 500, h: 400 },
  countdown: { w: 500, h: 500 },
  'dad-joke': { w: 500, h: 200 },
  text: { w: 400, h: 150 },
  image: { w: 400, h: 300 },
  quote: { w: 500, h: 200 },
  todo: { w: 350, h: 400 },
  'sticky-note': { w: 300, h: 250 },
  greeting: { w: 500, h: 150 },
  news: { w: 500, h: 200 },
  'stock-ticker': { w: 400, h: 300 },
  crypto: { w: 400, h: 250 },
  'word-of-day': { w: 450, h: 200 },
  history: { w: 500, h: 200 },
};
