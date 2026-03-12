'use client';

import { format, getWeek, getDayOfYear } from 'date-fns';
import type { DateViewProps } from './types';

export default function DateMinimalView({ config, now, scaledFontSize, containerRef }: DateViewProps) {
  const dateFormat = config.dateFormat || 'MMMM d';
  let dateStr: string;
  try {
    dateStr = format(now, dateFormat);
  } catch {
    dateStr = format(now, 'MMMM d');
  }

  const infoParts: string[] = [];
  if (config.showWeekNumber) infoParts.push(`Week ${getWeek(now)}`);
  if (config.showDayOfYear) infoParts.push(`Day ${getDayOfYear(now)}`);

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col items-center justify-center"
    >
      <div
        className="tracking-wide"
        style={{ fontSize: scaledFontSize * 2 }}
        suppressHydrationWarning
      >
        {dateStr}
      </div>

      {infoParts.length > 0 && (
        <div
          className="opacity-40 mt-2 tracking-wider uppercase"
          style={{ fontSize: scaledFontSize * 0.8 }}
          suppressHydrationWarning
        >
          {infoParts.join(' \u00b7 ')}
        </div>
      )}
    </div>
  );
}
