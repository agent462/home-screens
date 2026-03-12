'use client';

import type { ClockViewProps } from './types';

export default function ClockMinimalView({ config, now, scaledFontSize, containerRef }: ClockViewProps) {
  const hours = now.getHours();
  const minutes = now.getMinutes();

  const h = config.format24h ? hours : hours % 12 || 12;
  const hStr = config.format24h ? String(h).padStart(2, '0') : String(h);
  const mStr = String(minutes).padStart(2, '0');

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center"
    >
      <span
        className="tabular-nums"
        style={{
          fontSize: scaledFontSize * 3.5,
          fontWeight: 100,
          letterSpacing: '0.05em',
          lineHeight: 1,
        }}
        suppressHydrationWarning
      >
        {hStr}:{mStr}
      </span>
    </div>
  );
}
