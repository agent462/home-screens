import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import type { ModuleType } from '@/types/config';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const moduleComponents: Record<ModuleType, ComponentType<any>> = {
  clock: dynamic(() => import('@/components/modules/ClockModule')),
  calendar: dynamic(() => import('@/components/modules/CalendarModule')),
  'weather-hourly': dynamic(() => import('@/components/modules/WeatherHourlyModule')),
  'weather-forecast': dynamic(() => import('@/components/modules/WeatherForecastModule')),
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
};
