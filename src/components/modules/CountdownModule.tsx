'use client';

import { useState, useEffect } from 'react';
import type { CountdownConfig, ModuleStyle } from '@/types/config';
import ModuleWrapper from './ModuleWrapper';

function getTimeRemaining(targetDate: string) {
  const diff = new Date(targetDate).getTime() - Date.now();
  const absDiff = Math.abs(diff);
  const past = diff < 0;

  const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((absDiff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, past, totalMs: diff };
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function FlipCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center" style={{ gap: '0.2em' }}>
      <div
        className="relative flex items-center justify-center overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.12) 49.5%, rgba(0,0,0,0.15) 49.5%, rgba(0,0,0,0.15) 50.5%, rgba(255,255,255,0.08) 50.5%, rgba(255,255,255,0.08) 100%)',
          minWidth: '1.8em',
          height: '2.2em',
          padding: '0 0.25em',
          borderRadius: '0.2em',
          boxShadow: '0 2px 6px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
        }}
      >
        <span
          className="font-bold tabular-nums leading-none"
          style={{ fontSize: '1.3em', letterSpacing: '-0.02em' }}
        >
          {value}
        </span>
      </div>
      <span className="uppercase tracking-widest opacity-40 leading-none" style={{ fontSize: '0.3em' }}>
        {label}
      </span>
    </div>
  );
}

function FlipSeparator() {
  return (
    <div className="flex flex-col items-center justify-center self-stretch" style={{ paddingBottom: '1em', width: '0.4em' }}>
      <div className="flex flex-col items-center" style={{ gap: '0.25em' }}>
        <div className="rounded-full" style={{ width: '0.22em', height: '0.22em', background: 'rgba(255,255,255,0.3)' }} />
        <div className="rounded-full" style={{ width: '0.22em', height: '0.22em', background: 'rgba(255,255,255,0.3)' }} />
      </div>
    </div>
  );
}

interface CountdownModuleProps {
  config: CountdownConfig;
  style: ModuleStyle;
}

export default function CountdownModule({ config, style }: CountdownModuleProps) {
  const [now, setNow] = useState(Date.now());
  const scale = config.scale ?? 1;
  const basePx = 28 * scale;

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const events = config.events
    .map((event) => ({
      ...event,
      time: getTimeRemaining(event.date),
    }))
    .filter((event) => config.showPastEvents || !event.time.past)
    .sort((a, b) => {
      if (a.time.past !== b.time.past) return a.time.past ? 1 : -1;
      return a.time.totalMs - b.time.totalMs;
    });

  void now;

  return (
    <ModuleWrapper style={style}>
      <div className="flex flex-col h-full overflow-y-auto" style={{ gap: `${1.2 * scale}em` }}>
        {events.length === 0 ? (
          <p className="opacity-50" style={{ fontSize: '0.875em' }}>No upcoming events</p>
        ) : (
          events.map((event) => (
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
          ))
        )}
      </div>
    </ModuleWrapper>
  );
}
