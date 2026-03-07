'use client';

import { useEffect } from 'react';
import { format } from 'date-fns';
import type { WeatherHourlyConfig, ModuleStyle } from '@/types/config';
import { useAutoScale } from '@/hooks/useAutoScale';
import ModuleWrapper from './ModuleWrapper';

export interface HourlyWeather {
  time: string;
  temp: number;
  feelsLike?: number;
  humidity?: number;
  windSpeed?: number;
  precipProbability?: number;
  icon: string;
  description: string;
}

interface WeatherHourlyModuleProps {
  config: WeatherHourlyConfig;
  style: ModuleStyle;
  data?: HourlyWeather[];
  todayHigh?: number;
  todayLow?: number;
}

export default function WeatherHourlyModule({ config, style, data, todayHigh, todayLow }: WeatherHourlyModuleProps) {
  const hours = (data ?? []).slice(0, config.hoursToShow);
  const { containerRef, contentRef, recalculate } = useAutoScale<HTMLDivElement>();

  useEffect(() => { recalculate(); }, [data, config.hoursToShow, recalculate]);

  return (
    <ModuleWrapper style={style}>
      <div ref={containerRef} className="w-full h-full overflow-hidden">
        <div ref={contentRef} className="inline-flex flex-col">
          <h2 className="font-semibold mb-3 opacity-80" style={{ fontSize: '1.125em' }}>Hourly Forecast</h2>
          {hours.length === 0 ? (
            <p className="opacity-50" style={{ fontSize: '0.875em' }}>No weather data</p>
          ) : (
            <div className="flex items-center gap-5">
              {/* Current weather - large */}
              <div className="flex flex-col items-center shrink-0">
                <div className="flex items-center gap-2">
                  <span className="font-light" style={{ fontSize: '3em' }}>{Math.round(hours[0].temp)}&deg;</span>
                  <span style={{ fontSize: '2.5em' }}>{hours[0].icon}</span>
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
                    <span className="opacity-60" style={{ fontSize: '0.85em' }}>
                      💧 {Math.round(hours[0].humidity)}%
                    </span>
                  )}
                  {config.showWind && hours[0].windSpeed != null && (
                    <span className="opacity-60" style={{ fontSize: '0.85em' }}>
                      💨 {Math.round(hours[0].windSpeed)}
                    </span>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="self-stretch w-px opacity-30 bg-current shrink-0" />

              {/* Upcoming hours */}
              <div className="flex gap-4 items-end">
                {hours.slice(1).map((hour, i) => (
                  <div key={i} className="flex flex-col items-center gap-1 min-w-[60px]">
                    <span className="opacity-60" style={{ fontSize: '0.75em' }}>
                      {format(new Date(hour.time), 'h a')}
                    </span>
                    <span style={{ fontSize: '1.5em' }}>{hour.icon}</span>
                    {config.showPrecipitation !== false && hour.precipProbability != null && hour.precipProbability > 0 && (
                      <span className="opacity-50" style={{ fontSize: '0.7em' }}>💧{Math.round(hour.precipProbability)}%</span>
                    )}
                    <span className="font-medium" style={{ fontSize: '0.875em' }}>{Math.round(hour.temp)}&deg;</span>
                    {config.showHumidity && hour.humidity != null && (
                      <span className="opacity-50" style={{ fontSize: '0.7em' }}>💧{Math.round(hour.humidity)}%</span>
                    )}
                    {config.showWind && hour.windSpeed != null && (
                      <span className="opacity-50" style={{ fontSize: '0.7em' }}>💨{Math.round(hour.windSpeed)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </ModuleWrapper>
  );
}
