'use client';

import { useEffect, useState } from 'react';
import type { Screen, GlobalSettings } from '@/types/config';
import { DEFAULT_DISPLAY_WIDTH, DEFAULT_DISPLAY_HEIGHT, WEATHER_REFRESH_MS, CALENDAR_REFRESH_MS } from '@/lib/constants';
import { moduleComponents } from '@/lib/module-components';

function useFetchData<T>(url: string, refreshMs: number): T | null {
  const [data, setData] = useState<T | null>(null);

  useEffect(() => {
    if (!url) { setData(null); return; }
    let mounted = true;

    async function fetchData() {
      try {
        const res = await fetch(url);
        if (res.ok && mounted) {
          setData(await res.json());
        }
      } catch {
        // silently retry on next interval
      }
    }

    fetchData();
    const interval = setInterval(fetchData, refreshMs);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [url, refreshMs]);

  return data;
}

interface ScreenRendererProps {
  screen: Screen;
  settings: GlobalSettings;
  rotatingBackground?: string;
}

export default function ScreenRenderer({ screen, settings, rotatingBackground }: ScreenRendererProps) {
  const weatherUrl = `/api/weather?lat=${settings.weather.latitude}&lon=${settings.weather.longitude}&units=${settings.weather.units}&provider=${settings.weather.provider}`;
  const calendarIdList = settings.calendar.googleCalendarIds?.length
    ? settings.calendar.googleCalendarIds
    : settings.calendar.googleCalendarId ? [settings.calendar.googleCalendarId] : [];
  const calendarUrl = calendarIdList.length
    ? `/api/calendar?calendarIds=${encodeURIComponent(calendarIdList.join(','))}`
    : '';
  const weatherData = useFetchData(weatherUrl, WEATHER_REFRESH_MS);
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

  // Scale the canvas to fit the viewport
  const scale = viewportSize.w > 0
    ? Math.min(viewportSize.w / displayW, viewportSize.h / displayH)
    : 1;

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

        // Build extra props based on module type
        const extraProps: Record<string, unknown> = {};
        if (mod.type === 'calendar' && calendarData) {
          extraProps.events = Array.isArray(calendarData) ? calendarData : (calendarData as Record<string, unknown>).events ?? [];
        } else if (mod.type === 'weather-hourly' && weatherData) {
          extraProps.data = (weatherData as Record<string, unknown>).hourly ?? weatherData;
          const forecast = (weatherData as Record<string, unknown>).forecast as Array<Record<string, unknown>> | undefined;
          if (forecast?.[0]) {
            extraProps.todayHigh = forecast[0].high;
            extraProps.todayLow = forecast[0].low;
          }
        } else if (mod.type === 'weather-forecast' && weatherData) {
          extraProps.data = (weatherData as Record<string, unknown>).forecast ?? weatherData;
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
