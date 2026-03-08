'use client';

import { CloudRain, Droplets, Wind } from 'lucide-react';
import type { WeatherHourlyConfig, ModuleStyle } from '@/types/config';
import type { HourlyWeather } from '@/lib/weather';
import { getWeatherIcon } from '@/lib/weather-icons';
import { useScaledFontSize } from '@/hooks/useScaledFontSize';
import ModuleWrapper from './ModuleWrapper';

interface WeatherHourlyModuleProps {
  config: WeatherHourlyConfig;
  style: ModuleStyle;
  data?: HourlyWeather[];
  todayHigh?: number;
  todayLow?: number;
  timezone?: string;
}

export default function WeatherHourlyModule({ config, style, data, todayHigh, todayLow, timezone }: WeatherHourlyModuleProps) {
  const hours = (data ?? []).slice(0, config.hoursToShow);
  const { containerRef, scaledFontSize } = useScaledFontSize(style.fontSize, 0.09);

  return (
    <ModuleWrapper style={style}>
      <div ref={containerRef} className="w-full h-full flex flex-col" style={{ fontSize: `${scaledFontSize}px` }}>
        <h2 className="font-semibold mb-3 opacity-80 shrink-0" style={{ fontSize: '1.125em' }}>Hourly Forecast</h2>
        {hours.length === 0 ? (
          <p className="opacity-50" style={{ fontSize: '0.875em' }}>No weather data</p>
        ) : (
          <div className="flex items-center gap-5 flex-1 min-h-0">
            {/* Current weather - large */}
            <div className="flex flex-col items-center justify-center shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-light" style={{ fontSize: '3em' }}>{Math.round(hours[0].temp)}&deg;</span>
                {(() => { const Icon = getWeatherIcon(hours[0].icon); return <Icon size="2.5em" strokeWidth={1.5} />; })()}
              </div>
              <div className="flex flex-col items-center gap-0.5">
                {todayHigh != null && todayLow != null && (
                  <span className="opacity-60" style={{ fontSize: '0.85em' }}>
                    H:{Math.round(todayHigh)}&deg; L:{Math.round(todayLow)}&deg;
                  </span>
                )}
                {config.showFeelsLike !== false && hours[0].feelsLike != null && (
                  <span className="opacity-60" style={{ fontSize: '0.85em' }}>
                    Feels like {Math.round(hours[0].feelsLike)}
                  </span>
                )}
                {config.showHumidity && hours[0].humidity != null && (
                  <span className="opacity-60 flex items-center gap-0.5" style={{ fontSize: '0.85em' }}>
                    <Droplets size="1em" /> {Math.round(hours[0].humidity)}%
                  </span>
                )}
                {config.showWind && hours[0].windSpeed != null && (
                  <span className="opacity-60 flex items-center gap-0.5" style={{ fontSize: '0.85em' }}>
                    <Wind size="1em" /> {Math.round(hours[0].windSpeed)}
                  </span>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="self-stretch w-px opacity-30 bg-current shrink-0" />

            {/* Upcoming hours - fill remaining space */}
            <div className="flex flex-1 min-w-0 min-h-0 items-stretch justify-around">
              {hours.slice(1).map((hour, i) => {
                const Icon = getWeatherIcon(hour.icon);
                return (
                  <div key={i} className="flex flex-col items-center justify-evenly min-h-0">
                    <span className="opacity-60" style={{ fontSize: '0.75em' }}>
                      {new Date(hour.time).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        hour12: true,
                        ...(timezone ? { timeZone: timezone } : {}),
                      })}
                    </span>
                    <Icon size="1.8em" strokeWidth={1.5} />
                    {config.showPrecipitation !== false && hour.precipProbability != null && (
                      <span className="opacity-50 flex items-center gap-0.5" style={{ fontSize: '0.7em' }}>
                        <CloudRain size="1em" />{Math.round(hour.precipProbability)}%
                      </span>
                    )}
                    <span className="font-medium" style={{ fontSize: '0.875em' }}>{Math.round(hour.temp)}&deg;</span>
                    {config.showHumidity && hour.humidity != null && (
                      <span className="opacity-50 flex items-center gap-0.5" style={{ fontSize: '0.7em' }}>
                        <Droplets size="1em" />{Math.round(hour.humidity)}%
                      </span>
                    )}
                    {config.showWind && hour.windSpeed != null && (
                      <span className="opacity-50 flex items-center gap-0.5" style={{ fontSize: '0.7em' }}>
                        <Wind size="1em" />{Math.round(hour.windSpeed)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </ModuleWrapper>
  );
}
