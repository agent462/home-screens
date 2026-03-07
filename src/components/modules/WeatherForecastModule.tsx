'use client';

import { useEffect } from 'react';
import { format, isToday, isTomorrow } from 'date-fns';
import type { WeatherForecastConfig, ModuleStyle } from '@/types/config';
import { useAutoScale } from '@/hooks/useAutoScale';
import ModuleWrapper from './ModuleWrapper';

export interface DayForecast {
  date: string;
  icon: string;
  high: number;
  low: number;
  description: string;
  precipProbability?: number;
  precipAmount?: number;
  humidity?: number;
  windSpeed?: number;
}

interface WeatherForecastModuleProps {
  config: WeatherForecastConfig;
  style: ModuleStyle;
  data?: DayForecast[];
  units?: 'metric' | 'imperial';
}

function dayLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tmrw';
  return format(date, 'EEE');
}

export default function WeatherForecastModule({ config, style, data, units = 'imperial' }: WeatherForecastModuleProps) {
  const days = (data ?? []).slice(0, config.daysToShow);
  const windUnit = units === 'metric' ? 'km/h' : 'mph';
  const { containerRef, contentRef, recalculate } = useAutoScale<HTMLDivElement>();

  useEffect(() => { recalculate(); }, [data, config, recalculate]);

  const showHighLow = config.showHighLow !== false;

  return (
    <ModuleWrapper style={style}>
      <div ref={containerRef} className="w-full h-full overflow-hidden">
        <div ref={contentRef} className="inline-flex flex-col">
          <h2 className="font-semibold mb-3 opacity-80" style={{ fontSize: '1.125em' }}>Forecast</h2>
          {days.length === 0 ? (
            <p className="opacity-50" style={{ fontSize: '0.875em' }}>No forecast data</p>
          ) : (
            <div className="flex items-center gap-5">
              {/* Today - large */}
              <div className="flex flex-col items-center shrink-0">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: '2.5em' }}>{days[0].icon}</span>
                  {showHighLow && (
                    <div className="flex flex-col">
                      <span className="font-light" style={{ fontSize: '2em' }}>{Math.round(days[0].high)}&deg;</span>
                      <span className="opacity-50" style={{ fontSize: '1.2em' }}>{Math.round(days[0].low)}&deg;</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  {config.showPrecipitation && days[0].precipProbability != null && days[0].precipProbability > 0 && (
                    <span className="opacity-60" style={{ fontSize: '0.85em' }}>
                      💧 {Math.round(days[0].precipProbability)}%
                    </span>
                  )}
                  {config.showHumidity && days[0].humidity != null && (
                    <span className="opacity-60" style={{ fontSize: '0.85em' }}>
                      💧 {Math.round(days[0].humidity)}%
                    </span>
                  )}
                  {config.showWind && days[0].windSpeed != null && (
                    <span className="opacity-60" style={{ fontSize: '0.85em' }}>
                      💨 {Math.round(days[0].windSpeed)} {windUnit}
                    </span>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="self-stretch w-px opacity-30 bg-current shrink-0" />

              {/* Upcoming days */}
              <div className="flex gap-4 items-end">
                {days.slice(1).map((day, i) => (
                  <div key={i} className="flex flex-col items-center gap-1 min-w-[60px]">
                    <span className="opacity-60" style={{ fontSize: '0.75em' }}>
                      {dayLabel(day.date)}
                    </span>
                    <span style={{ fontSize: '1.5em' }}>{day.icon}</span>
                    {config.showPrecipitation && day.precipProbability != null && day.precipProbability > 0 && (
                      <span className="opacity-50" style={{ fontSize: '0.7em' }}>💧{Math.round(day.precipProbability)}%</span>
                    )}
                    {config.showPrecipAmount && day.precipAmount != null && day.precipAmount > 0 && (
                      <span className="opacity-50" style={{ fontSize: '0.7em' }}>{day.precipAmount.toFixed(1)}&quot;</span>
                    )}
                    {showHighLow && (
                      <div className="flex gap-1" style={{ fontSize: '0.875em' }}>
                        <span className="font-medium">{Math.round(day.high)}&deg;</span>
                        <span className="opacity-50">{Math.round(day.low)}&deg;</span>
                      </div>
                    )}
                    {config.showHumidity && day.humidity != null && (
                      <span className="opacity-50" style={{ fontSize: '0.7em' }}>💧{Math.round(day.humidity)}%</span>
                    )}
                    {config.showWind && day.windSpeed != null && (
                      <span className="opacity-50" style={{ fontSize: '0.7em' }}>💨{Math.round(day.windSpeed)} {windUnit}</span>
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
