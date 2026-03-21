'use client';

import { useMemo } from 'react';
import type { Screen, GlobalSettings } from '@/types/config';
import { getModuleComponent } from '@/lib/module-components';
import { getModuleDefinition } from '@/lib/module-registry';
import { isModuleVisible } from '@/lib/schedule';
import { useTZClock } from '@/hooks/useTZClock';
import PluginPlaceholder from '@/components/modules/PluginPlaceholder';

export interface SharedDisplayData {
  owmData: unknown;
  wapiData: unknown;
  pirateData: unknown;
  noaaData: unknown;
  openMeteoData: unknown;
  calendarData: unknown;
}

interface ScreenRendererProps {
  screen: Screen;
  settings: GlobalSettings;
  rotatingBackground?: string;
  sharedData: SharedDisplayData;
  displayW: number;
  displayH: number;
  scale: number;
}

export function resolveProvider(mod: { type: string; config: Record<string, unknown> }, globalProvider: string): string {
  if (mod.type === 'weather') {
    const p = mod.config.provider as string | undefined;
    return (p && p !== 'global') ? p : globalProvider;
  }
  return globalProvider;
}

export default function ScreenRenderer({ screen, settings, rotatingBackground, sharedData, displayW, displayH, scale }: ScreenRendererProps) {
  const globalProvider = settings.weather.provider;

  // Minute-resolution timezone-aware clock for module scheduling
  const now = useTZClock(settings.timezone);

  const visibleModules = useMemo(
    () => screen.modules.filter((mod) => isModuleVisible(mod.schedule, now)),
    [screen.modules, now],
  );

  const rotation = screen.backgroundRotation;
  const backgroundImage = rotation?.enabled ? (rotatingBackground || screen.backgroundImage) : screen.backgroundImage;

  const lat = settings.latitude ?? settings.weather.latitude;
  const lon = settings.longitude ?? settings.weather.longitude;
  const locationMissing = lat == null || lon == null || (lat === 0 && lon === 0);

  function getWeatherData(mod: { type: string; config: Record<string, unknown> }): Record<string, unknown> | null {
    const p = resolveProvider(mod, globalProvider);
    if (p === 'openweathermap') return sharedData.owmData as Record<string, unknown> | null;
    if (p === 'weatherapi') return sharedData.wapiData as Record<string, unknown> | null;
    if (p === 'pirateweather') return sharedData.pirateData as Record<string, unknown> | null;
    if (p === 'noaa') return sharedData.noaaData as Record<string, unknown> | null;
    if (p === 'open-meteo') return sharedData.openMeteoData as Record<string, unknown> | null;
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

      {visibleModules.map((mod) => {
        const Component = getModuleComponent(mod.type);

        // Show placeholder for unavailable plugin modules
        if (!Component) {
          if (mod.type.startsWith('plugin:')) {
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
                  overflow: 'hidden',
                }}
              >
                <PluginPlaceholder moduleType={mod.type} />
              </div>
            );
          }
          return null;
        }

        const extraProps: Record<string, unknown> = {};
        extraProps.timezone = settings.timezone;

        // Inject location for modules that declare the requirement (built-in or plugin)
        const def = getModuleDefinition(mod.type);
        const needsLocation = def?.dataRequirements?.includes('location') ?? false;
        if (needsLocation) {
          extraProps.latitude = settings.latitude ?? settings.weather.latitude;
          extraProps.longitude = settings.longitude ?? settings.weather.longitude;
        }

        const weatherData = getWeatherData(mod);

        // Inject calendar data for calendar module or plugins declaring the requirement
        const needsCalendar = mod.type === 'calendar' || def?.dataRequirements?.includes('calendar');
        if (needsCalendar && sharedData.calendarData) {
          extraProps.events = Array.isArray(sharedData.calendarData) ? sharedData.calendarData : (sharedData.calendarData as Record<string, unknown>).events ?? [];
        }

        // Inject weather data for weather module or plugins declaring the requirement
        const needsWeather = mod.type === 'weather' || def?.dataRequirements?.includes('weather');
        if (needsWeather) {
          if (locationMissing) {
            extraProps.locationMissing = true;
          }
          if (weatherData) {
            extraProps.hourly = weatherData.hourly ?? [];
            extraProps.forecast = weatherData.forecast ?? [];
            extraProps.minutely = weatherData.minutely;
            extraProps.alerts = weatherData.alerts;
          }
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
              overflow: 'hidden',
            }}
          >
            <Component config={mod.config} style={mod.style} {...extraProps} />
          </div>
        );
      })}
    </div>
  );
}
