'use client';

import { useState, useEffect } from 'react';
import { createTZDate } from '@/lib/timezone';
import type { YearProgressConfig, ModuleStyle } from '@/types/config';
import ModuleWrapper from './ModuleWrapper';

interface YearProgressModuleProps {
  config: YearProgressConfig;
  style: ModuleStyle;
  timezone?: string;
}

function getProgress(now: Date) {
  // Extract date parts from the (possibly timezone-shifted) Date.
  // All arithmetic uses these parts directly so we never mix timezone contexts.
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  const hours = now.getHours();
  const minutes = now.getMinutes();

  // Year progress — use day-of-year / total days
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const daysInYear = isLeap ? 366 : 365;
  const dayOfYear = Math.floor(
    (Date.UTC(year, month, day) - Date.UTC(year, 0, 1)) / 86_400_000,
  );
  const yearPercent = ((dayOfYear + (hours * 60 + minutes) / 1440) / daysInYear) * 100;

  // Month progress — use day-of-month / total days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthPercent = (((day - 1) + (hours * 60 + minutes) / 1440) / daysInMonth) * 100;

  // Week progress (Mon=0, Sun=6)
  const jsDay = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const weekDay = jsDay === 0 ? 6 : jsDay - 1; // Mon=0, Sun=6
  const minutesInDay = hours * 60 + minutes;
  const weekMinutesElapsed = weekDay * 1440 + minutesInDay;
  const weekPercent = (weekMinutesElapsed / (7 * 1440)) * 100;

  // Day progress
  const dayPercent = (minutesInDay / 1440) * 100;

  return { yearPercent, monthPercent, weekPercent, dayPercent, year };
}

function ProgressBar({ label, percent, showPercentage }: { label: string; percent: number; showPercentage: boolean }) {
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div className="flex flex-col" style={{ gap: '0.25em' }}>
      <div className="flex justify-between items-baseline">
        <span className="opacity-70" style={{ fontSize: '0.85em' }}>{label}</span>
        {showPercentage && (
          <span className="tabular-nums opacity-50" style={{ fontSize: '0.75em' }}>
            {clamped.toFixed(1)}%
          </span>
        )}
      </div>
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height: '5px', background: 'rgba(255,255,255,0.1)' }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${clamped}%`,
            background: 'rgba(255,255,255,0.7)',
            transition: 'width 0.5s ease',
          }}
        />
      </div>
    </div>
  );
}

export default function YearProgressModule({ config, style, timezone }: YearProgressModuleProps) {
  const [now, setNow] = useState(() => createTZDate(timezone));

  useEffect(() => {
    const interval = setInterval(() => setNow(createTZDate(timezone)), 60_000);
    return () => clearInterval(interval);
  }, [timezone]);

  const showYear = config.showYear ?? true;
  const showMonth = config.showMonth ?? true;
  const showWeek = config.showWeek ?? true;
  const showDay = config.showDay ?? true;
  const showPercentage = config.showPercentage ?? true;

  const { yearPercent, monthPercent, weekPercent, dayPercent, year } = getProgress(now);

  const monthName = now.toLocaleString('default', { month: 'long' });
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const jsDay = now.getDay();
  const dayName = dayNames[jsDay === 0 ? 6 : jsDay - 1];

  return (
    <ModuleWrapper style={style}>
      <div className="flex flex-col justify-center h-full" style={{ gap: '1em' }}>
        {showYear && (
          <ProgressBar label={String(year)} percent={yearPercent} showPercentage={showPercentage} />
        )}
        {showMonth && (
          <ProgressBar label={monthName} percent={monthPercent} showPercentage={showPercentage} />
        )}
        {showWeek && (
          <ProgressBar label="Week" percent={weekPercent} showPercentage={showPercentage} />
        )}
        {showDay && (
          <ProgressBar label={dayName} percent={dayPercent} showPercentage={showPercentage} />
        )}
      </div>
    </ModuleWrapper>
  );
}
