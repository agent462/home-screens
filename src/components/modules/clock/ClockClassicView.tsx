'use client';

import { format, getWeek, getDayOfYear } from 'date-fns';
import type { ClockViewProps } from './types';

export default function ClockClassicView({ config, now, scaledFontSize, containerRef }: ClockViewProps) {
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  const h = config.format24h ? hours : hours % 12 || 12;
  const hStr = config.format24h ? String(h).padStart(2, '0') : String(h);
  const mStr = String(minutes).padStart(2, '0');
  const sStr = String(seconds).padStart(2, '0');
  const ampm = config.format24h ? '' : hours >= 12 ? ' PM' : ' AM';

  const dateStr = config.showDate ? format(now, config.dateFormat || 'EEEE, MMMM d') : null;

  const weekNumber = getWeek(now);
  const dayOfYear = getDayOfYear(now);
  const infoParts: string[] = [];
  if (config.showWeekNumber) infoParts.push(`Week ${weekNumber}`);
  if (config.showDayOfYear) infoParts.push(`Day ${dayOfYear}`);
  const infoStr = infoParts.length > 0 ? infoParts.join(' \u00b7 ') : null;

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col items-center justify-center"
    >
      <style>{`
        @keyframes clock-colon-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .clock-colon-pulse {
          animation: clock-colon-pulse 2s ease-in-out infinite;
        }
      `}</style>

      <div
        className="font-light tracking-wide tabular-nums"
        style={{ fontSize: scaledFontSize * 3, lineHeight: 1.1 }}
        suppressHydrationWarning
      >
        {config.showSeconds ? (
          <>
            {hStr}
            <span className="clock-colon-pulse">:</span>
            {mStr}
            <span className="clock-colon-pulse">:</span>
            {sStr}
            {ampm && <span className="opacity-50" style={{ fontSize: '0.4em', marginLeft: '0.15em' }}>{ampm}</span>}
          </>
        ) : (
          <>
            {hStr}
            <span className="clock-colon-pulse">:</span>
            {mStr}
            {ampm && <span className="opacity-50" style={{ fontSize: '0.4em', marginLeft: '0.15em' }}>{ampm}</span>}
          </>
        )}
      </div>

      {dateStr && (
        <div
          className="opacity-60 mt-2 tracking-wide"
          style={{ fontSize: scaledFontSize * 1.125 }}
          suppressHydrationWarning
        >
          {dateStr}
        </div>
      )}

      {infoStr && (
        <div
          className="opacity-40 mt-1 tracking-wider uppercase"
          style={{ fontSize: scaledFontSize * 0.85 }}
          suppressHydrationWarning
        >
          {infoStr}
        </div>
      )}
    </div>
  );
}
