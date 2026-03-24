import { FlipCard, FlipSeparator } from './FlipCard';
import { pad } from './countdown-utils';
import type { CountdownViewProps } from './types';

export default function CountdownNextView({ events, scale, basePx }: CountdownViewProps) {
  const event = events[0];

  if (!event) {
    return <p className="opacity-50" style={{ fontSize: '0.875em' }}>No upcoming events</p>;
  }

  // Use a larger scale since we have the full module area for one event
  const nextBasePx = basePx * 1.3;

  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <div className="flex flex-col items-center" style={{ gap: `${0.6 * scale}em` }}>
        <p
          className="font-semibold text-center opacity-90"
          style={{ fontSize: `${Math.max(14, 18 * scale)}px` }}
        >
          {event.name}
          {event.time.past && <span className="opacity-50 ml-1 font-normal">(ago)</span>}
        </p>
        <div className="flex items-start justify-center" style={{ fontSize: `${nextBasePx}px`, gap: '0.15em' }}>
          {event.time.days > 0 && (
            <>
              <FlipCard value={String(event.time.days)} label="days" />
              <FlipSeparator />
            </>
          )}
          <FlipCard value={pad(event.time.hours)} label="hrs" />
          <FlipSeparator />
          <FlipCard value={pad(event.time.minutes)} label="min" />
          <FlipSeparator />
          <FlipCard value={pad(event.time.seconds)} label="sec" />
        </div>
      </div>
    </div>
  );
}
