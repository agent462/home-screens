'use client';

import SunCalc from 'suncalc';
import { formatTimeInTZ } from '@/lib/timezone';
import { useTZClock } from '@/hooks/useTZClock';
import type { SunriseSunsetConfig, ModuleStyle } from '@/types/config';
import ModuleWrapper from './ModuleWrapper';
import { LocationRequired } from './LocationRequired';

interface SunriseSunsetModuleProps {
  config: SunriseSunsetConfig;
  style: ModuleStyle;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

function getDayLength(sunrise: Date, sunset: Date): string {
  if (isNaN(sunrise.getTime()) || isNaN(sunset.getTime())) return '—';
  const diffMs = sunset.getTime() - sunrise.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

export default function SunriseSunsetModule({ config, style, latitude, longitude, timezone }: SunriseSunsetModuleProps) {
  const now = useTZClock(timezone);

  if (latitude == null || longitude == null) {
    return <LocationRequired style={style} />;
  }

  const times = SunCalc.getTimes(now, latitude, longitude);

  return (
    <ModuleWrapper style={style}>
      <div className="flex flex-col items-center justify-center h-full" style={{ gap: '0.6em' }}>
        <div className="flex items-center justify-center w-full" style={{ gap: '1.5em' }}>
          {/* Sunrise */}
          <div className="flex flex-col items-center" style={{ gap: '0.15em' }}>
            <span style={{ fontSize: '1.4em' }}>↑</span>
            <span className="opacity-50 uppercase tracking-widest" style={{ fontSize: '0.55em' }}>
              Sunrise
            </span>
            <span className="font-light" style={{ fontSize: '1.3em' }}>
              {formatTimeInTZ(times.sunrise, timezone)}
            </span>
          </div>

          {/* Sunset */}
          <div className="flex flex-col items-center" style={{ gap: '0.15em' }}>
            <span style={{ fontSize: '1.4em' }}>↓</span>
            <span className="opacity-50 uppercase tracking-widest" style={{ fontSize: '0.55em' }}>
              Sunset
            </span>
            <span className="font-light" style={{ fontSize: '1.3em' }}>
              {formatTimeInTZ(times.sunset, timezone)}
            </span>
          </div>
        </div>

        {config.showDayLength && (
          <span className="opacity-50" style={{ fontSize: '0.8em' }}>
            Day length: {getDayLength(times.sunrise, times.sunset)}
          </span>
        )}

        {config.showGoldenHour && (
          <span className="opacity-50" style={{ fontSize: '0.8em' }}>
            Golden hour: {formatTimeInTZ(times.goldenHour, timezone)}
          </span>
        )}
      </div>
    </ModuleWrapper>
  );
}
