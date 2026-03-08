'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { format, isToday, isTomorrow } from 'date-fns';
import { Droplets, Wind } from 'lucide-react';
import type { WeatherForecastConfig, ModuleStyle } from '@/types/config';
import { getWeatherIcon } from '@/lib/weather-icons';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [scaledFontSize, setScaledFontSize] = useState<number>(style.fontSize);

  const updateFontSize = useCallback(() => {
    if (containerRef.current) {
      const h = containerRef.current.clientHeight;
      setScaledFontSize(Math.max(style.fontSize, h * 0.12));
    }
  }, [style.fontSize]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateFontSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateFontSize]);

  const showHighLow = config.showHighLow !== false;

  return (
    <ModuleWrapper style={style}>
      <div ref={containerRef} className="w-full h-full flex flex-col overflow-visible" style={{ fontSize: `${scaledFontSize}px` }}>
        <div className="flex flex-col flex-1 min-h-0">
          <h2 className="font-semibold mb-3 opacity-80" style={{ fontSize: '1.125em' }}>Forecast</h2>
          {days.length === 0 ? (
            <p className="opacity-50" style={{ fontSize: '0.875em' }}>No forecast data</p>
          ) : (
            <div className="flex items-center gap-5 flex-1 min-h-0">
              {/* Today - large */}
              <div className="flex flex-col items-center shrink-0">
                <div className="flex items-center gap-2">
                  {(() => { const Icon = getWeatherIcon(days[0].icon); return <Icon size="2.5em" strokeWidth={1.5} />; })()}
                  {showHighLow && (
                    <div className="flex flex-col">
                      <span className="font-light" style={{ fontSize: '2em' }}>{Math.round(days[0].high)}&deg;</span>
                      <span className="opacity-50" style={{ fontSize: '1.2em' }}>{Math.round(days[0].low)}&deg;</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  {config.showPrecipitation && days[0].precipProbability != null && (
                    <span className="opacity-60 flex items-center gap-0.5" style={{ fontSize: '0.85em' }}>
                      <Droplets size="1em" /> {Math.round(days[0].precipProbability)}%
                    </span>
                  )}
                  {config.showHumidity && days[0].humidity != null && (
                    <span className="opacity-60 flex items-center gap-0.5" style={{ fontSize: '0.85em' }}>
                      <Droplets size="1em" /> {Math.round(days[0].humidity)}%
                    </span>
                  )}
                  {config.showWind && days[0].windSpeed != null && (
                    <span className="opacity-60 flex items-center gap-0.5" style={{ fontSize: '0.85em' }}>
                      <Wind size="1em" /> {Math.round(days[0].windSpeed)} {windUnit}
                    </span>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="self-stretch w-px opacity-30 bg-current shrink-0" />

              {/* Upcoming days */}
              <div className="flex flex-1 min-w-0 items-center justify-around flex-wrap gap-y-3">
                {days.slice(1).map((day, i) => {
                  const Icon = getWeatherIcon(day.icon);
                  return (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <span className="opacity-60" style={{ fontSize: '0.75em' }}>
                        {dayLabel(day.date)}
                      </span>
                      <Icon size="1.8em" strokeWidth={1.5} />
                      {config.showPrecipitation && day.precipProbability != null && (
                        <span className="opacity-50 flex items-center gap-0.5" style={{ fontSize: '0.7em' }}>
                          <Droplets size="1em" />{Math.round(day.precipProbability)}%
                        </span>
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
                        <span className="opacity-50 flex items-center gap-0.5" style={{ fontSize: '0.7em' }}>
                          <Droplets size="1em" />{Math.round(day.humidity)}%
                        </span>
                      )}
                      {config.showWind && day.windSpeed != null && (
                        <span className="opacity-50 flex items-center gap-0.5" style={{ fontSize: '0.7em' }}>
                          <Wind size="1em" />{Math.round(day.windSpeed)} {windUnit}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </ModuleWrapper>
  );
}
