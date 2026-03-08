import type { ModuleType } from '@/types/config';
import type { LucideIcon } from 'lucide-react';
import {
  Clock, CalendarDays, CloudSun, Sun, Hourglass, Laugh, Type, ImageIcon,
  Quote, ListTodo, StickyNote, HandMetal,
  Newspaper, TrendingUp, Bitcoin, BookOpen, History,
  Moon, Sunrise, Image, QrCode, BarChart3, Car, Trophy, Wind,
} from 'lucide-react';
import { DEFAULT_MODULE_SIZES } from './constants';

export interface ModuleDefinition {
  type: ModuleType;
  label: string;
  icon: LucideIcon;
  defaultConfig: Record<string, unknown>;
  defaultSize: { w: number; h: number };
}

const registry = new Map<ModuleType, ModuleDefinition>();

function registerModule(definition: ModuleDefinition): void {
  registry.set(definition.type, definition);
}

export function getModuleDefinition(type: ModuleType): ModuleDefinition | undefined {
  return registry.get(type);
}

export function getAllModuleDefinitions(): ModuleDefinition[] {
  return Array.from(registry.values());
}

// Register all modules
registerModule({
  type: 'clock',
  label: 'Clock',
  icon: Clock,
  defaultConfig: {
    format24h: false,
    showSeconds: true,
    showDate: true,
    dateFormat: 'EEEE, MMMM d',
    showWeekNumber: false,
    showDayOfYear: false,
  },
  defaultSize: DEFAULT_MODULE_SIZES.clock,
});

registerModule({
  type: 'calendar',
  label: 'Calendar',
  icon: CalendarDays,
  defaultConfig: {
    daysToShow: 3,
    showTime: true,
    showLocation: false,
  },
  defaultSize: DEFAULT_MODULE_SIZES.calendar,
});

registerModule({
  type: 'weather-hourly',
  label: 'Hourly Weather',
  icon: CloudSun,
  defaultConfig: {
    hoursToShow: 8,
    showFeelsLike: true,
    showPrecipitation: true,
    showHumidity: false,
    showWind: false,
  },
  defaultSize: DEFAULT_MODULE_SIZES['weather-hourly'],
});

registerModule({
  type: 'weather-forecast',
  label: 'Weather Forecast',
  icon: Sun,
  defaultConfig: {
    daysToShow: 5,
    showHighLow: true,
    showPrecipitation: true,
    showPrecipAmount: false,
    showHumidity: false,
    showWind: false,
  },
  defaultSize: DEFAULT_MODULE_SIZES['weather-forecast'],
});

registerModule({
  type: 'countdown',
  label: 'Countdown',
  icon: Hourglass,
  defaultConfig: {
    events: [],
    showPastEvents: false,
    scale: 1,
  },
  defaultSize: DEFAULT_MODULE_SIZES.countdown,
});

registerModule({
  type: 'dad-joke',
  label: 'Dad Joke',
  icon: Laugh,
  defaultConfig: {
    refreshIntervalMs: 60000,
  },
  defaultSize: DEFAULT_MODULE_SIZES['dad-joke'],
});

registerModule({
  type: 'text',
  label: 'Text',
  icon: Type,
  defaultConfig: {
    content: 'Hello, World!',
    alignment: 'center',
  },
  defaultSize: DEFAULT_MODULE_SIZES.text,
});

registerModule({
  type: 'image',
  label: 'Image',
  icon: ImageIcon,
  defaultConfig: {
    src: '',
    objectFit: 'cover',
    alt: '',
  },
  defaultSize: DEFAULT_MODULE_SIZES.image,
});

registerModule({
  type: 'quote',
  label: 'Quote of the Day',
  icon: Quote,
  defaultConfig: {
    refreshIntervalMs: 300000,
  },
  defaultSize: DEFAULT_MODULE_SIZES.quote,
});

registerModule({
  type: 'todo',
  label: 'To-Do List',
  icon: ListTodo,
  defaultConfig: {
    title: 'To Do',
    items: [],
  },
  defaultSize: DEFAULT_MODULE_SIZES.todo,
});

registerModule({
  type: 'sticky-note',
  label: 'Sticky Note',
  icon: StickyNote,
  defaultConfig: {
    content: 'Write something here...',
    noteColor: '#fef08a',
  },
  defaultSize: DEFAULT_MODULE_SIZES['sticky-note'],
});

registerModule({
  type: 'greeting',
  label: 'Greeting',
  icon: HandMetal,
  defaultConfig: {
    name: 'Friend',
  },
  defaultSize: DEFAULT_MODULE_SIZES.greeting,
});

registerModule({
  type: 'news',
  label: 'News Headlines',
  icon: Newspaper,
  defaultConfig: {
    feedUrl: '',
    refreshIntervalMs: 300000,
    rotateIntervalMs: 10000,
  },
  defaultSize: DEFAULT_MODULE_SIZES.news,
});

registerModule({
  type: 'stock-ticker',
  label: 'Stock Ticker',
  icon: TrendingUp,
  defaultConfig: {
    symbols: 'AAPL,GOOGL,MSFT',
    refreshIntervalMs: 60000,
  },
  defaultSize: DEFAULT_MODULE_SIZES['stock-ticker'],
});

registerModule({
  type: 'crypto',
  label: 'Crypto Price',
  icon: Bitcoin,
  defaultConfig: {
    ids: 'bitcoin,ethereum',
    refreshIntervalMs: 60000,
  },
  defaultSize: DEFAULT_MODULE_SIZES.crypto,
});

registerModule({
  type: 'word-of-day',
  label: 'Word of the Day',
  icon: BookOpen,
  defaultConfig: {},
  defaultSize: DEFAULT_MODULE_SIZES['word-of-day'],
});

registerModule({
  type: 'history',
  label: 'This Day in History',
  icon: History,
  defaultConfig: {
    refreshIntervalMs: 3600000,
    rotationIntervalSec: 10,
  },
  defaultSize: DEFAULT_MODULE_SIZES.history,
});

registerModule({
  type: 'moon-phase',
  label: 'Moon Phase',
  icon: Moon,
  defaultConfig: {
    showIllumination: true,
    showMoonTimes: true,
  },
  defaultSize: DEFAULT_MODULE_SIZES['moon-phase'],
});

registerModule({
  type: 'sunrise-sunset',
  label: 'Sunrise / Sunset',
  icon: Sunrise,
  defaultConfig: {
    showDayLength: true,
    showGoldenHour: false,
  },
  defaultSize: DEFAULT_MODULE_SIZES['sunrise-sunset'],
});

registerModule({
  type: 'photo-slideshow',
  label: 'Photo Slideshow',
  icon: Image,
  defaultConfig: {
    directory: '',
    intervalMs: 30000,
    transition: 'fade',
    objectFit: 'cover',
  },
  defaultSize: DEFAULT_MODULE_SIZES['photo-slideshow'],
});

registerModule({
  type: 'qr-code',
  label: 'QR Code',
  icon: QrCode,
  defaultConfig: {
    data: '',
    label: '',
    fgColor: '#ffffff',
    bgColor: 'transparent',
  },
  defaultSize: DEFAULT_MODULE_SIZES['qr-code'],
});

registerModule({
  type: 'year-progress',
  label: 'Year Progress',
  icon: BarChart3,
  defaultConfig: {
    showYear: true,
    showMonth: true,
    showWeek: true,
    showDay: true,
    showPercentage: true,
  },
  defaultSize: DEFAULT_MODULE_SIZES['year-progress'],
});

registerModule({
  type: 'traffic',
  label: 'Traffic / Commute',
  icon: Car,
  defaultConfig: {
    routes: [],
    refreshIntervalMs: 300000,
  },
  defaultSize: DEFAULT_MODULE_SIZES.traffic,
});

registerModule({
  type: 'sports',
  label: 'Sports Scores',
  icon: Trophy,
  defaultConfig: {
    leagues: ['nba', 'nfl'],
    refreshIntervalMs: 60000,
  },
  defaultSize: DEFAULT_MODULE_SIZES.sports,
});

registerModule({
  type: 'air-quality',
  label: 'Air Quality',
  icon: Wind,
  defaultConfig: {
    showAQI: true,
    showPollutants: false,
    showUV: true,
    refreshIntervalMs: 900000,
  },
  defaultSize: DEFAULT_MODULE_SIZES['air-quality'],
});
