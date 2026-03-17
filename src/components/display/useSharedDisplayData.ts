'use client';

import { useMemo } from 'react';
import type { Screen, GlobalSettings } from '@/types/config';
import { resolveProvider } from './ScreenRenderer';
import type { SharedDisplayData } from './ScreenRenderer';
import { useFetchData } from '@/hooks/useFetchData';
import { WEATHER_REFRESH_MS, CALENDAR_REFRESH_MS } from '@/lib/constants';

/** Fetch weather + calendar data once, shared across all screen rotations. */
export function useSharedDisplayData(screens: Screen[], settings: GlobalSettings): SharedDisplayData {
  const globalProvider = settings.weather.provider;
  const lat = settings.latitude ?? settings.weather.latitude;
  const lon = settings.longitude ?? settings.weather.longitude;
  const baseParams = `lat=${lat}&lon=${lon}&units=${settings.weather.units}`;

  const neededProviders = useMemo(() => {
    const needed = new Set<string>();
    for (const screen of screens) {
      for (const mod of screen.modules) {
        if (mod.type === 'weather') needed.add(resolveProvider(mod, globalProvider));
      }
    }
    return needed;
  }, [screens, globalProvider]);

  const weatherUrl = (provider: string) =>
    neededProviders.has(provider) ? `/api/weather?${baseParams}&provider=${provider}` : '';

  const [owmData] = useFetchData(weatherUrl('openweathermap'), WEATHER_REFRESH_MS);
  const [wapiData] = useFetchData(weatherUrl('weatherapi'), WEATHER_REFRESH_MS);
  const [pirateData] = useFetchData(weatherUrl('pirateweather'), WEATHER_REFRESH_MS);
  const [noaaData] = useFetchData(weatherUrl('noaa'), WEATHER_REFRESH_MS);
  const [openMeteoData] = useFetchData(weatherUrl('open-meteo'), WEATHER_REFRESH_MS);

  const calendarIdList = settings.calendar.googleCalendarIds?.length
    ? settings.calendar.googleCalendarIds
    : settings.calendar.googleCalendarId ? [settings.calendar.googleCalendarId] : [];
  const hasIcalSources = settings.calendar.icalSources?.some(s => s.enabled);
  const hasHolidays = !!settings.calendar.holidayCountry;
  const calendarUrl = (calendarIdList.length || hasIcalSources || hasHolidays)
    ? calendarIdList.length
      ? `/api/calendar?calendarIds=${encodeURIComponent(calendarIdList.join(','))}`
      : '/api/calendar'
    : '';
  const [calendarData] = useFetchData(calendarUrl, CALENDAR_REFRESH_MS);

  return { owmData, wapiData, pirateData, noaaData, openMeteoData, calendarData };
}
