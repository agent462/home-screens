export type ModuleType =
  | 'clock'
  | 'calendar'
  | 'weather-hourly'
  | 'weather-forecast'
  | 'countdown'
  | 'dad-joke'
  | 'text'
  | 'image'
  | 'quote'
  | 'todo'
  | 'sticky-note'
  | 'greeting'
  | 'news'
  | 'stock-ticker'
  | 'crypto'
  | 'word-of-day'
  | 'history';

export interface ModuleStyle {
  opacity: number;
  borderRadius: number;
  padding: number;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  fontSize: number;
  backdropBlur: number;
}

export interface ModulePosition {
  x: number;
  y: number;
}

export interface ModuleSize {
  w: number;
  h: number;
}

export interface ModuleInstance {
  id: string;
  type: ModuleType;
  position: ModulePosition;
  size: ModuleSize;
  zIndex: number;
  config: Record<string, unknown>;
  style: ModuleStyle;
}

export interface BackgroundRotation {
  enabled: boolean;
  query: string;
  intervalMinutes: number;
}

export interface Screen {
  id: string;
  name: string;
  backgroundImage: string;
  backgroundRotation?: BackgroundRotation;
  modules: ModuleInstance[];
}

export interface WeatherSettings {
  provider: 'openweathermap' | 'weatherapi';
  apiKey: string;
  latitude: number;
  longitude: number;
  units: 'metric' | 'imperial';
}

export interface CalendarSettings {
  googleCalendarId: string;
  googleCalendarIds: string[];
  maxEvents: number;
  daysAhead: number;
}

export interface GlobalSettings {
  rotationIntervalMs: number;
  displayWidth: number;
  displayHeight: number;
  weather: WeatherSettings;
  calendar: CalendarSettings;
  unsplashAccessKey?: string;
}

export interface ScreenConfiguration {
  version: number;
  settings: GlobalSettings;
  screens: Screen[];
}

// Default style for new modules
export const DEFAULT_MODULE_STYLE: ModuleStyle = {
  opacity: 1,
  borderRadius: 12,
  padding: 16,
  backgroundColor: 'rgba(0, 0, 0, 0.4)',
  textColor: '#ffffff',
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 16,
  backdropBlur: 12,
};

// Clock module config
export interface ClockConfig {
  format24h: boolean;
  showSeconds: boolean;
  showDate: boolean;
  dateFormat: string;
  showWeekNumber: boolean;
  showDayOfYear: boolean;
}

// Calendar module config
export interface CalendarConfig {
  daysToShow: number;
  showTime: boolean;
  showLocation: boolean;
}

// Weather hourly config
export interface WeatherHourlyConfig {
  hoursToShow: number;
  showFeelsLike: boolean;
  showPrecipitation: boolean;
  showHumidity: boolean;
  showWind: boolean;
}

// Weather forecast config
export interface WeatherForecastConfig {
  daysToShow: number;
  showHighLow: boolean;
  showPrecipitation: boolean;
  showPrecipAmount: boolean;
  showHumidity: boolean;
  showWind: boolean;
}

// Countdown config
export interface CountdownEvent {
  id: string;
  name: string;
  date: string; // ISO date string
}

export interface CountdownConfig {
  events: CountdownEvent[];
  showPastEvents: boolean;
  scale: number; // 0.5 – 4, default 1
}

// Dad joke config
export interface DadJokeConfig {
  refreshIntervalMs: number;
}

// Text module config
export interface TextConfig {
  content: string;
  alignment: 'left' | 'center' | 'right';
}

// Image module config
export interface ImageConfig {
  src: string;
  objectFit: 'cover' | 'contain' | 'fill';
  alt: string;
}

// Quote module config
export interface QuoteConfig {
  refreshIntervalMs: number;
}

// Todo module config
export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface TodoConfig {
  title: string;
  items: TodoItem[];
}

// Sticky note module config
export interface StickyNoteConfig {
  content: string;
  noteColor: string;
}

// Greeting module config
export interface GreetingConfig {
  name: string;
}

// News module config
export interface NewsConfig {
  feedUrl: string;
  refreshIntervalMs: number;
  rotateIntervalMs: number;
}

// Stock ticker module config
export interface StockTickerConfig {
  symbols: string;
  refreshIntervalMs: number;
  cardScale?: number;
}

// Crypto module config
export interface CryptoConfig {
  ids: string;
  refreshIntervalMs: number;
  cardScale?: number;
}

// Word of the day module config
export interface WordOfDayConfig {}

// This day in history module config
export interface HistoryConfig {
  refreshIntervalMs: number;
}

