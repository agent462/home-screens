'use client';

import { format } from 'date-fns';
import { parseClockTime, buildInfoParts } from '@/lib/date-info';
import type { ClockViewProps } from './types';

export default function ClockClassicView({ config, now, scaledFontSize, containerRef }: ClockViewProps) {
  const { hStr, mStr, sStr, period: ampm } = parseClockTime(config.format24h, now);

  const dateStr = config.showDate ? format(now, config.dateFormat || 'EEEE, MMMM d') : null;

  const infoParts = buildInfoParts(config, now);
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
