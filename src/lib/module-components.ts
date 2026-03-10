import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import type { ModuleType } from '@/types/config';

// Module components have heterogeneous props (each module has its own config
// type). We assert the record type because ComponentType is contravariant in
// props, preventing direct assignment of specific component types.
export const moduleComponents = {
  clock: dynamic(() => import('@/components/modules/ClockModule')),
  calendar: dynamic(() => import('@/components/modules/CalendarModule')),
  weather: dynamic(() => import('@/components/modules/weather/WeatherModule')),
  countdown: dynamic(() => import('@/components/modules/CountdownModule')),
  'dad-joke': dynamic(() => import('@/components/modules/DadJokeModule')),
  text: dynamic(() => import('@/components/modules/TextModule')),
  image: dynamic(() => import('@/components/modules/ImageModule')),
  quote: dynamic(() => import('@/components/modules/QuoteModule')),
  todo: dynamic(() => import('@/components/modules/TodoModule')),
  'sticky-note': dynamic(() => import('@/components/modules/StickyNoteModule')),
  greeting: dynamic(() => import('@/components/modules/GreetingModule')),
  news: dynamic(() => import('@/components/modules/NewsModule')),
  'stock-ticker': dynamic(() => import('@/components/modules/StockTickerModule')),
  crypto: dynamic(() => import('@/components/modules/CryptoModule')),
  'word-of-day': dynamic(() => import('@/components/modules/WordOfDayModule')),
  history: dynamic(() => import('@/components/modules/HistoryModule')),
  'moon-phase': dynamic(() => import('@/components/modules/MoonPhaseModule')),
  'sunrise-sunset': dynamic(() => import('@/components/modules/SunriseSunsetModule')),
  'photo-slideshow': dynamic(() => import('@/components/modules/PhotoSlideshowModule')),
  'qr-code': dynamic(() => import('@/components/modules/QRCodeModule')),
  'year-progress': dynamic(() => import('@/components/modules/YearProgressModule')),
  traffic: dynamic(() => import('@/components/modules/TrafficModule')),
  sports: dynamic(() => import('@/components/modules/sports/SportsModule')),
  'air-quality': dynamic(() => import('@/components/modules/AirQualityModule')),
  todoist: dynamic(() => import('@/components/modules/TodoistModule')),
} as unknown as Record<ModuleType, ComponentType<Record<string, unknown>>>;
