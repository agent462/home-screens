'use client';

import { format, getWeek, getDayOfYear } from 'date-fns';
import { useTZClock } from '@/hooks/useTZClock';
import type { ClockConfig, ModuleStyle } from '@/types/config';
import ModuleWrapper from './ModuleWrapper';

interface ClockModuleProps {
  config: ClockConfig;
  style: ModuleStyle;
  timezone?: string;
}

export default function ClockModule({ config, style, timezone }: ClockModuleProps) {
  const now = useTZClock(timezone, 1000);

  const timeFormat = config.format24h
    ? config.showSeconds ? 'HH:mm:ss' : 'HH:mm'
    : config.showSeconds ? 'h:mm:ss a' : 'h:mm a';

  const showWeekNumber = config.showWeekNumber ?? false;
  const showDayOfYear = config.showDayOfYear ?? false;

  const infoParts: string[] = [];
  if (showWeekNumber) infoParts.push(`Week ${getWeek(now)}`);
  if (showDayOfYear) {
    const isLeapYear = (now.getFullYear() % 4 === 0 && now.getFullYear() % 100 !== 0) || now.getFullYear() % 400 === 0;
    infoParts.push(`Day ${getDayOfYear(now)} of ${isLeapYear ? 366 : 365}`);
  }

  return (
    <ModuleWrapper style={style}>
      <div className="flex flex-col items-center justify-center h-full">
        <span className="font-light tracking-tight" style={{ fontSize: '3em' }}>
          {format(now, timeFormat)}
        </span>
        {config.showDate && (
          <span className="mt-2 opacity-70" style={{ fontSize: '1.125em' }}>
            {format(now, config.dateFormat)}
          </span>
        )}
        {infoParts.length > 0 && (
          <span className="mt-1 opacity-50" style={{ fontSize: '0.85em' }}>
            {infoParts.join(' \u00B7 ')}
          </span>
        )}
      </div>
    </ModuleWrapper>
  );
}
