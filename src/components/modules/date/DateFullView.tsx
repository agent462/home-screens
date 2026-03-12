'use client';

import { format, getWeek, getDayOfYear } from 'date-fns';
import type { DateViewProps } from './types';

export default function DateFullView({ config, now, scaledFontSize, containerRef }: DateViewProps) {
  const dayNumber = format(now, 'd');
  const monthName = format(now, 'MMMM');
  const dayName = format(now, 'EEEE');
  const year = format(now, 'yyyy');

  const infoParts: string[] = [];
  if (config.showWeekNumber) infoParts.push(`Week ${getWeek(now)}`);
  if (config.showDayOfYear) infoParts.push(`Day ${getDayOfYear(now)}`);

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col items-center justify-center"
    >
      {config.showDayName && (
        <div
          className="uppercase tracking-[0.2em] opacity-50 font-medium"
          style={{ fontSize: scaledFontSize * 0.9 }}
          suppressHydrationWarning
        >
          {dayName}
        </div>
      )}
      <div
        className="font-light leading-none"
        style={{ fontSize: scaledFontSize * 4.5, color: config.accentColor }}
        suppressHydrationWarning
      >
        {dayNumber}
      </div>
      <div
        className="uppercase tracking-[0.15em] opacity-70 font-medium"
        style={{ fontSize: scaledFontSize * 1.1 }}
        suppressHydrationWarning
      >
        {monthName}{config.showYear ? ` ${year}` : ''}
      </div>

      {infoParts.length > 0 && (
        <div
          className="opacity-40 mt-2 tracking-wider uppercase"
          style={{ fontSize: scaledFontSize * 0.75 }}
          suppressHydrationWarning
        >
          {infoParts.join(' \u00b7 ')}
        </div>
      )}
    </div>
  );
}
