export type ModuleType =
  | 'clock'
  | 'calendar'
  | 'weather'
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
  | 'history'
  | 'moon-phase'
  | 'sunrise-sunset'
  | 'photo-slideshow'
  | 'qr-code'
  | 'year-progress'
  | 'traffic'
  | 'sports'
  | 'air-quality'
  | 'todoist';

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

export interface SleepSettings {
  enabled: boolean;
  dimAfterMinutes: number;
  sleepAfterMinutes: number;
  dimBrightness: number;
  dimSchedule?: {
    startTime: string; // "23:00"
    endTime: string;   // "06:00"
  };
  schedule?: {
    startTime: string; // "23:00"
    endTime: string;   // "06:00"
  };
}

export type ScreensaverMode = 'clock' | 'blank' | 'off';

export interface ScreensaverSettings {
  mode: ScreensaverMode;
}

export interface GlobalSettings {
  rotationIntervalMs: number;
  displayWidth: number;
  displayHeight: number;
  displayTransform?: 'normal' | '90' | '180' | '270';
  latitude: number;
  longitude: number;
  locationName?: string;
  timezone?: string;
  weather: WeatherSettings;
  calendar: CalendarSettings;
  sleep?: SleepSettings;
  screensaver?: ScreensaverSettings;
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
export type CalendarViewMode = 'daily' | 'agenda' | 'week' | 'month';

export interface CalendarConfig {
  viewMode: CalendarViewMode;
  daysToShow: number;
  showTime: boolean;
  showLocation: boolean;
  maxEvents: number;
  showWeekNumbers: boolean;
}

// Unified weather module config
export type WeatherView = 'current' | 'hourly' | 'daily' | 'combined' | 'compact' | 'table';

export type WeatherIconSet = 'outline' | 'color';
export type WeatherProviderOption = 'global' | 'openweathermap' | 'weatherapi';

export interface WeatherConfig {
  view: WeatherView;
  iconSet: WeatherIconSet;
  provider: WeatherProviderOption;
  hoursToShow: number;
  showFeelsLike: boolean;
  daysToShow: number;
  showHighLow: boolean;
  showPrecipAmount: boolean;
  showPrecipitation: boolean;
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
export interface WordOfDayConfig {
  refreshIntervalMs: number;
}

// This day in history module config
export interface HistoryConfig {
  refreshIntervalMs: number;
  rotationIntervalMs: number;
}

// Moon phase module config
export interface MoonPhaseConfig {
  showIllumination: boolean;
  showMoonTimes: boolean;
}

// Sunrise / Sunset module config
export interface SunriseSunsetConfig {
  showDayLength: boolean;
  showGoldenHour: boolean;
}

// Photo slideshow module config
export interface PhotoSlideshowConfig {
  directory: string;
  intervalMs: number;
  transition: 'fade' | 'none';
  objectFit: 'cover' | 'contain' | 'fill';
  refreshIntervalMs: number;
}

// QR code module config
export interface QRCodeConfig {
  data: string;
  label: string;
  fgColor: string;
  bgColor: string;
}

// Year progress module config
export interface YearProgressConfig {
  showYear: boolean;
  showMonth: boolean;
  showWeek: boolean;
  showDay: boolean;
  showPercentage: boolean;
}

// Traffic / Commute module config
export interface TrafficRoute {
  label: string;
  origin: string;
  destination: string;
}

export interface TrafficConfig {
  routes: TrafficRoute[];
  refreshIntervalMs: number;
}

// Sports scores module config
export interface SportsConfig {
  leagues: string[];
  refreshIntervalMs: number;
}

// Todoist module config
export type TodoistViewMode = 'list' | 'board' | 'focus';
export type TodoistGroupBy = 'none' | 'project' | 'priority' | 'date' | 'label';
export type TodoistSortBy = 'default' | 'priority' | 'due_date' | 'alphabetical';

export interface TodoistConfig {
  viewMode: TodoistViewMode;
  groupBy: TodoistGroupBy;
  sortBy: TodoistSortBy;
  projectFilter: string;
  labelFilter: string;
  showNoDueDate: boolean;
  showSubtasks: boolean;
  showLabels: boolean;
  showProject: boolean;
  showDescription: boolean;
  maxTasks: number;
  refreshIntervalMs: number;
  title: string;
}

// Air quality module config
export interface AirQualityConfig {
  showAQI: boolean;
  showPollutants: boolean;
  showUV: boolean;
  refreshIntervalMs: number;
}

