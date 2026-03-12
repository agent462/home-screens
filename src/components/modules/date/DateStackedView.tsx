'use client';

import { format, getWeek, getDayOfYear } from 'date-fns';
import type { DateViewProps } from './types';

export default function DateStackedView({ config, now, scaledFontSize, containerRef }: DateViewProps) {
  const dayName = format(now, 'EEEE');
  const dayNumber = format(now, 'd');
  const monthName = format(now, 'MMMM');
  const year = format(now, 'yyyy');

  const infoParts: string[] = [];
  if (config.showWeekNumber) infoParts.push(`Week ${getWeek(now)}`);
  if (config.showDayOfYear) infoParts.push(`Day ${getDayOfYear(now)}`);

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col items-center justify-center gap-1"
    >
      {config.showDayName && (
        <div
          className="uppercase tracking-[0.25em] opacity-50 font-light"
          style={{ fontSize: scaledFontSize * 0.85 }}
          suppressHydrationWarning
        >
          {dayName}
        </div>
      )}
      <div
        className="w-12 border-t opacity-20"
        style={{ borderColor: config.accentColor }}
      />
      <div
        className="font-semibold leading-none"
        style={{ fontSize: scaledFontSize * 3 }}
        suppressHydrationWarning
      >
        {dayNumber}
      </div>
      <div
        className="w-12 border-t opacity-20"
        style={{ borderColor: config.accentColor }}
      />
      <div
        className="uppercase tracking-[0.2em] opacity-60"
        style={{ fontSize: scaledFontSize * 0.9 }}
        suppressHydrationWarning
      >
        {monthName}{config.showYear ? ` ${year}` : ''}
      </div>

      {infoParts.length > 0 && (
        <div
          className="opacity-40 mt-1 tracking-wider uppercase"
          style={{ fontSize: scaledFontSize * 0.7 }}
          suppressHydrationWarning
        >
          {infoParts.join(' \u00b7 ')}
        </div>
      )}
    </div>
  );
}
