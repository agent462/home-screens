'use client';

import { useEffect, useState, useMemo } from 'react';
import type { Screen, GlobalSettings } from '@/types/config';
import { DEFAULT_DISPLAY_WIDTH, DEFAULT_DISPLAY_HEIGHT, WEATHER_REFRESH_MS, CALENDAR_REFRESH_MS } from '@/lib/constants';
import { moduleComponents } from '@/lib/module-components';
import { useFetchData } from '@/hooks/useFetchData';

interface ScreenRendererProps {
  screen: Screen;
  settings: GlobalSettings;
  rotatingBackground?: string;
}

function resolveProvider(mod: { type: string; config: Record<string, unknown> }, globalProvider: string): string {
  if (mod.type === 'weather') {
    const p = mod.config.provider as string | undefined;
    return (p && p !== 'global') ? p : globalProvider;
  }
  // Legacy modules always use the global provider
  return globalProvider;
}

export default function ScreenRenderer({ screen, settings, rotatingBackground }: ScreenRendererProps) {
  const lat = settings.latitude ?? settings.weather.latitude;
  const lon = settings.longitude ?? settings.weather.longitude;
  const globalProvider = settings.weather.provider;
  const baseParams = `lat=${lat}&lon=${lon}&units=${settings.weather.units}`;

  // Determine which providers are needed by weather modules on this screen
  const { needsOWM, needsWAPI } = useMemo(() => {
    let owm = false;
    let wapi = false;
    for (const mod of screen.modules) {
      if (mod.type === 'weather' || mod.type === 'weather-hourly' || mod.type === 'weather-forecast') {
        const p = resolveProvider(mod, globalProvider);
        if (p === 'openweathermap') owm = true;
        if (p === 'weatherapi') wapi = true;
      }
    }
    return { needsOWM: owm, needsWAPI: wapi };
  }, [screen.modules, globalProvider]);

  // Always call both hooks (React rules), empty URL = no fetch
  const owmUrl = needsOWM ? `/api/weather?${baseParams}&provider=openweathermap` : '';
  const wapiUrl = needsWAPI ? `/api/weather?${baseParams}&provider=weatherapi` : '';
  const owmData = useFetchData(owmUrl, WEATHER_REFRESH_MS);
  const wapiData = useFetchData(wapiUrl, WEATHER_REFRESH_MS);

  const calendarIdList = settings.calendar.googleCalendarIds?.length
    ? settings.calendar.googleCalendarIds
    : settings.calendar.googleCalendarId ? [settings.calendar.googleCalendarId] : [];
  const calendarUrl = calendarIdList.length
    ? `/api/calendar?calendarIds=${encodeURIComponent(calendarIdList.join(','))}`
    : '';
  const calendarData = useFetchData(calendarUrl, CALENDAR_REFRESH_MS);

  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    function update() {
      setViewportSize({ w: window.innerWidth, h: window.innerHeight });
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const rotation = screen.backgroundRotation;
  const backgroundImage = rotation?.enabled ? (rotatingBackground || screen.backgroundImage) : screen.backgroundImage;

  const displayW = settings.displayWidth || DEFAULT_DISPLAY_WIDTH;
  const displayH = settings.displayHeight || DEFAULT_DISPLAY_HEIGHT;

  const scale = viewportSize.w > 0
    ? Math.min(viewportSize.w / displayW, viewportSize.h / displayH)
    : 1;

  function getWeatherData(mod: { type: string; config: Record<string, unknown> }): Record<string, unknown> | null {
    const p = resolveProvider(mod, globalProvider);
    if (p === 'openweathermap') return owmData as Record<string, unknown> | null;
    if (p === 'weatherapi') return wapiData as Record<string, unknown> | null;
    return null;
  }

  return (
    <div
      style={{
        width: displayW,
        height: displayH,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#000',
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
      }}
    >
      {backgroundImage && (
        <img
          src={backgroundImage}
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'opacity 1s ease-in-out',
          }}
        />
      )}

      {screen.modules.map((mod) => {
        const Component = moduleComponents[mod.type];
        if (!Component) return null;

        const extraProps: Record<string, unknown> = {};
        extraProps.timezone = settings.timezone;

        if (['moon-phase', 'sunrise-sunset'].includes(mod.type)) {
          extraProps.latitude = settings.latitude ?? settings.weather.latitude;
          extraProps.longitude = settings.longitude ?? settings.weather.longitude;
        }

        const weatherData = getWeatherData(mod);

        if (mod.type === 'calendar' && calendarData) {
          extraProps.events = Array.isArray(calendarData) ? calendarData : (calendarData as Record<string, unknown>).events ?? [];
        } else if (mod.type === 'weather' && weatherData) {
          extraProps.hourly = weatherData.hourly ?? [];
          extraProps.forecast = weatherData.forecast ?? [];
          extraProps.units = settings.weather.units;
        } else if (mod.type === 'weather-hourly' && weatherData) {
          extraProps.data = weatherData.hourly ?? weatherData;
          const forecast = weatherData.forecast as Array<Record<string, unknown>> | undefined;
          if (forecast?.[0]) {
            extraProps.todayHigh = forecast[0].high;
            extraProps.todayLow = forecast[0].low;
          }
        } else if (mod.type === 'weather-forecast' && weatherData) {
          extraProps.data = weatherData.forecast ?? weatherData;
          extraProps.units = settings.weather.units;
        }

        return (
          <div
            key={mod.id}
            style={{
              position: 'absolute',
              left: mod.position.x,
              top: mod.position.y,
              width: mod.size.w,
              height: mod.size.h,
              zIndex: mod.zIndex,
            }}
          >
            <Component config={mod.config} style={mod.style} {...extraProps} />
          </div>
        );
      })}
    </div>
  );
}
