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
  | 'todoist'
  | 'rain-map'
  | 'multi-month'
  | 'garbage-day'
  | 'standings'
  | 'affirmations'
  | 'date';

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

export interface ModuleSchedule {
  daysOfWeek?: number[];    // 0=Sun, 1=Mon, ... 6=Sat (omit = every day)
  startTime?: string;       // "06:00" (omit = from midnight)
  endTime?: string;         // "09:00" (omit = until midnight)
  invert?: boolean;         // if true, HIDE during this window instead of show
}

export interface ModuleInstance {
  id: string;
  type: ModuleType;
  position: ModulePosition;
  size: ModuleSize;
  zIndex: number;
  config: Record<string, unknown>;
  style: ModuleStyle;
  schedule?: ModuleSchedule;
}

export interface BackgroundRotation {
  enabled: boolean;
  source?: 'unsplash' | 'nasa-apod';
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
  provider: 'openweathermap' | 'weatherapi' | 'pirateweather' | 'noaa';
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

export type TransitionEffect =
  | 'fade' | 'slide' | 'slide-up' | 'zoom'
  | 'flip' | 'blur' | 'crossfade' | 'none';

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
  cursorHideSeconds?: number;
  activeProfile?: string;
  piVariant?: 'desktop' | 'lite';
  transitionEffect?: TransitionEffect;
  transitionDuration?: number;
}

export interface Profile {
  id: string;
  name: string;
  screenIds: string[];
  schedule?: ModuleSchedule;
}

export interface ScreenConfiguration {
  version: number;
  settings: GlobalSettings;
  screens: Screen[];
  profiles?: Profile[];
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
export type ClockView =
  | 'classic' | 'digital' | 'analog' | 'minimal' | 'flip'
  | 'word' | 'binary' | 'vertical' | 'split' | 'progress'
  | 'fuzzy' | 'world' | 'dot-matrix' | 'radial' | 'arc'
  | 'neon' | 'bar' | 'elapsed';

export interface WorldClockZone {
  label: string;
  timezone: string;
}

export interface ClockConfig {
  view: ClockView;
  format24h: boolean;
  showSeconds: boolean;
  showDate: boolean;
  dateFormat: string;
  showWeekNumber: boolean;
  showDayOfYear: boolean;
  // View-specific
  showNumerals: boolean;        // analog: hour numbers on face
  animateFlip: boolean;         // flip: show flip animation on digit change
  accentColor: string;          // shared accent for several views
  worldZones: WorldClockZone[]; // world: additional timezones (max 3)
  referenceTime: string;        // elapsed: ISO timestamp or time string
  referenceLabel: string;       // elapsed: label ("market open", "shift start")
  countUp: boolean;             // elapsed: count up (true) or down (false)
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
export type WeatherView = 'current' | 'hourly' | 'daily' | 'combined' | 'compact' | 'table' | 'precipitation' | 'alerts';

export type WeatherIconSet = 'outline' | 'color';
export type WeatherProviderOption = 'global' | 'openweathermap' | 'weatherapi' | 'pirateweather' | 'noaa';

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
  showPressure: boolean;
  showVisibility: boolean;
  showDewPoint: boolean;
  hideWhenNoAlerts: boolean;
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
  orientation?: 'horizontal' | 'vertical' | 'sideways';
  verticalAlign?: 'top' | 'center' | 'bottom';
  // Rich text
  markdown?: boolean;
  // Auto-fit to container
  autoFit?: boolean;
  // Text effects
  effect?: 'none' | 'typewriter' | 'fade-in' | 'gradient-sweep' | 'glow';
  // Content rotation (split by separator)
  rotationEnabled?: boolean;
  rotationIntervalMs?: number;
  rotationSeparator?: string;
  // Gradient text
  gradientEnabled?: boolean;
  gradientFrom?: string;
  gradientTo?: string;
  gradientAngle?: number;
  // Typography
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  letterSpacing?: number;
  // Icon prefix (emoji or short text)
  icon?: string;
  // Dynamic template variables ({{time}}, {{date}}, {{greeting}}, etc.)
  templateVariables?: boolean;
  // Marquee scrolling
  marquee?: boolean;
  marqueeSpeed?: number;
  marqueeDirection?: 'left' | 'right' | 'up' | 'down';
  // Decorative
  showDividers?: boolean;
  accentColor?: string;
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
export type NewsView = 'headline' | 'list' | 'ticker' | 'compact';

export interface NewsConfig {
  feedUrl: string;
  view: NewsView;
  refreshIntervalMs: number;
  rotateIntervalMs: number;
  maxItems: number;
  showTimestamp: boolean;
  showDescription: boolean;
  tickerSpeed?: number;
}

// Stock ticker module config
export type StockTickerView = 'cards' | 'ticker' | 'table' | 'compact';

export interface StockTickerConfig {
  symbols: string;
  refreshIntervalMs: number;
  view: StockTickerView;
  cardScale?: number;
  tickerSpeed?: number;
}

// Crypto module config
export type CryptoView = 'cards' | 'ticker' | 'table' | 'compact';

export interface CryptoConfig {
  ids: string;
  refreshIntervalMs: number;
  view: CryptoView;
  cardScale?: number;
  tickerSpeed?: number;
}

// Word of the day module config (no fields — word is computed from a hardcoded list based on the date)
export type WordOfDayConfig = Record<string, never>;

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
export type SportsView = 'scoreboard' | 'cards' | 'list' | 'ticker';

export interface SportsConfig {
  view: SportsView;
  leagues: string[];
  refreshIntervalMs: number;
  tickerSpeed?: number;
}

// Todoist module config
type TodoistViewMode = 'list' | 'board' | 'focus';
export type TodoistGroupBy = 'none' | 'project' | 'priority' | 'date' | 'label';
type TodoistSortBy = 'default' | 'priority' | 'due_date' | 'alphabetical';

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

// Multi-month calendar config
type MultiMonthView = 'vertical' | 'horizontal';

export interface MultiMonthConfig {
  view: MultiMonthView;
  monthCount: number;
  startDay: 'sunday' | 'monday';
  showWeekNumbers: boolean;
  highlightWeekends: boolean;
  showAdjacentDays: boolean;
}

// Garbage day module config
export type GarbageFrequency = 'weekly' | 'biweekly';

export interface GarbageDayConfig {
  trashDay: number;            // 0=Sun, 1=Mon, ..., 6=Sat, -1=disabled
  trashFrequency: GarbageFrequency;
  trashStartDate: string;      // ISO date anchor for biweekly calculation
  trashColor: string;
  recyclingDay: number;
  recyclingFrequency: GarbageFrequency;
  recyclingStartDate: string;
  recyclingColor: string;
  customDay: number;
  customFrequency: GarbageFrequency;
  customStartDate: string;
  customColor: string;
  customLabel: string;
  highlightMode: 'day-of' | 'day-before';
}

// Rain map module config
type RainMapStyle = 'dark' | 'standard';

export interface RainMapConfig {
  latitude: number;
  longitude: number;
  zoom: number;
  animationSpeedMs: number;
  extraDelayLastFrameMs: number;
  colorScheme: number;
  smooth: boolean;
  showSnow: boolean;
  opacity: number;
  showTimestamp: boolean;
  showTimeline: boolean;
  refreshIntervalMs: number;
  mapStyle: RainMapStyle;
}

// Standings module config
export type StandingsView = 'table' | 'compact' | 'conference';
export type StandingsGrouping = 'division' | 'conference' | 'league';

export interface StandingsConfig {
  view: StandingsView;
  league: string;
  grouping: StandingsGrouping;
  teamsToShow: number;
  showPlayoffLine: boolean;
  rotationIntervalMs: number;
  refreshIntervalMs: number;
}

// Affirmations module config
export type AffirmationsView = 'elegant' | 'card' | 'minimal' | 'typewriter';
export type AffirmationsCategory = 'affirmations' | 'compliments' | 'motivational' | 'gratitude' | 'mindfulness';

export interface CustomAffirmation {
  id: string;
  text: string;
  attribution?: string;
}

export interface AffirmationsConfig {
  view: AffirmationsView;
  categories: AffirmationsCategory[];
  rotationIntervalMs: number;
  showCategoryLabel: boolean;
  timeAware: boolean;
  customEntries: CustomAffirmation[];
  accentColor: string;
}

// Date module config
export type DateView = 'full' | 'minimal' | 'stacked' | 'editorial' | 'banner';

export interface DateConfig {
  view: DateView;
  dateFormat: string;
  showDayName: boolean;
  showYear: boolean;
  showWeekNumber: boolean;
  showDayOfYear: boolean;
  accentColor: string;
}

