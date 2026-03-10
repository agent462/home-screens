'use client';

import { useEffect, useState } from 'react';
import type { Screen, GlobalSettings } from '@/types/config';
import { DEFAULT_DISPLAY_WIDTH, DEFAULT_DISPLAY_HEIGHT } from '@/lib/constants';
import { moduleComponents } from '@/lib/module-components';

export interface SharedDisplayData {
  owmData: unknown;
  wapiData: unknown;
  pirateData: unknown;
  calendarData: unknown;
}

interface ScreenRendererProps {
  screen: Screen;
  settings: GlobalSettings;
  rotatingBackground?: string;
  sharedData: SharedDisplayData;
}

function resolveProvider(mod: { type: string; config: Record<string, unknown> }, globalProvider: string): string {
  if (mod.type === 'weather') {
    const p = mod.config.provider as string | undefined;
    return (p && p !== 'global') ? p : globalProvider;
  }
  return globalProvider;
}

export default function ScreenRenderer({ screen, settings, rotatingBackground, sharedData }: ScreenRendererProps) {
  const globalProvider = settings.weather.provider;

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
    if (p === 'openweathermap') return sharedData.owmData as Record<string, unknown> | null;
    if (p === 'weatherapi') return sharedData.wapiData as Record<string, unknown> | null;
    if (p === 'pirateweather') return sharedData.pirateData as Record<string, unknown> | null;
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

        if (['moon-phase', 'sunrise-sunset', 'rain-map'].includes(mod.type)) {
          extraProps.latitude = settings.latitude ?? settings.weather.latitude;
          extraProps.longitude = settings.longitude ?? settings.weather.longitude;
        }

        const weatherData = getWeatherData(mod);

        if (mod.type === 'calendar' && sharedData.calendarData) {
          extraProps.events = Array.isArray(sharedData.calendarData) ? sharedData.calendarData : (sharedData.calendarData as Record<string, unknown>).events ?? [];
        } else if (mod.type === 'weather' && weatherData) {
          extraProps.hourly = weatherData.hourly ?? [];
          extraProps.forecast = weatherData.forecast ?? [];
          extraProps.minutely = weatherData.minutely;
          extraProps.alerts = weatherData.alerts;
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
