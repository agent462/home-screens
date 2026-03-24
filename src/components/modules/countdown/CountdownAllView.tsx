import { FlipCard, FlipSeparator } from './FlipCard';
import { pad } from './countdown-utils';
import type { CountdownViewProps } from './types';

export default function CountdownAllView({ events, scale, basePx }: CountdownViewProps) {
  if (events.length === 0) {
    return <p className="opacity-50" style={{ fontSize: '0.875em' }}>No upcoming events</p>;
  }

  return (
    <>
      {events.map((event) => (
        <div key={event.id} className="flex flex-col items-center" style={{ gap: `${0.3 * scale}em` }}>
          <p
            className="font-medium truncate w-full text-center opacity-70"
            style={{ fontSize: `${Math.max(12, 14 * scale)}px` }}
          >
            {event.name}
            {event.time.past && <span className="opacity-50 ml-1 font-normal">(ago)</span>}
          </p>
          <div className="flex items-start justify-center" style={{ fontSize: `${basePx}px`, gap: '0.15em' }}>
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
      ))}
    </>
  );
}
