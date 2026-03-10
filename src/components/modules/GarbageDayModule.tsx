'use client';

import { useTZClock } from '@/hooks/useTZClock';
import type { GarbageDayConfig, GarbageFrequency, ModuleStyle } from '@/types/config';
import ModuleWrapper from './ModuleWrapper';

interface GarbageDayModuleProps {
  config: GarbageDayConfig;
  style: ModuleStyle;
  timezone?: string;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

/**
 * Determines if a given date falls on a collection week.
 * For biweekly: counts weeks since the anchor date; even weeks = collection week.
 */
function isCollectionWeek(now: Date, scheduleDay: number, frequency: GarbageFrequency, startDate: string): boolean {
  if (frequency === 'weekly') return true;
  if (!startDate) return true; // no anchor set, assume every week

  // Normalize both dates to the start of their respective weeks (by schedule day)
  // so we compare whole-week offsets.
  const anchor = new Date(startDate + 'T00:00:00');
  if (isNaN(anchor.getTime())) return true;

  // Get the most recent occurrence of scheduleDay for both dates
  const getWeekStart = (d: Date) => {
    const copy = new Date(d);
    const diff = (copy.getDay() - scheduleDay + 7) % 7;
    copy.setDate(copy.getDate() - diff);
    copy.setHours(0, 0, 0, 0);
    return copy;
  };

  const anchorWeek = getWeekStart(anchor);
  const currentWeek = getWeekStart(now);

  const diffMs = currentWeek.getTime() - anchorWeek.getTime();
  const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));

  return diffWeeks % 2 === 0;
}

function isHighlighted(
  scheduleDay: number,
  today: number,
  mode: 'day-of' | 'day-before',
  now: Date,
  frequency: GarbageFrequency,
  startDate: string,
): boolean {
  if (scheduleDay < 0) return false;

  if (mode === 'day-of') {
    return today === scheduleDay && isCollectionWeek(now, scheduleDay, frequency, startDate);
  }

  // day-before: check if tomorrow is collection day on a collection week
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDay = tomorrow.getDay();
  return tomorrowDay === scheduleDay && isCollectionWeek(tomorrow, scheduleDay, frequency, startDate);
}

function getStatusText(
  scheduleDay: number,
  today: number,
  mode: 'day-of' | 'day-before',
  now: Date,
  frequency: GarbageFrequency,
  startDate: string,
): string {
  if (scheduleDay < 0) return '';
  if (isHighlighted(scheduleDay, today, mode, now, frequency, startDate)) {
    return mode === 'day-of' ? 'Today' : 'Tomorrow';
  }
  return '';
}

function getNextCollectionText(
  scheduleDay: number,
  now: Date,
  frequency: GarbageFrequency,
  startDate: string,
): string {
  if (scheduleDay < 0) return '';
  // Walk forward up to 14 days to find the next collection
  for (let i = 1; i <= 14; i++) {
    const future = new Date(now);
    future.setDate(future.getDate() + i);
    if (future.getDay() === scheduleDay && isCollectionWeek(future, scheduleDay, frequency, startDate)) {
      if (i === 1) return 'Tomorrow';
      if (i <= 6) return DAYS[future.getDay()];
      return `Next ${DAYS[future.getDay()]}`;
    }
  }
  return DAYS[scheduleDay];
}

// Trash can icon
function TrashIcon({ active, color }: { active: boolean; color: string }) {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: active ? 1 : 0.45 }}>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <rect x="5" y="6" width="14" height="15" rx="2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

// Recycling icon
function RecyclingIcon({ active, color }: { active: boolean; color: string }) {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: active ? 1 : 0.45 }}>
      <path d="M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5" />
      <path d="M11 19h8.203a1.83 1.83 0 0 0 1.556-.89 1.784 1.784 0 0 0 0-1.775l-1.226-2.12" />
      <path d="m14 16-3 3 3 3" />
      <path d="M8.293 13.596 4.875 7.97l5.088.018" />
      <path d="M7.074 9.456 9.09 5.7a1.83 1.83 0 0 1 1.575-.886c.642 0 1.226.33 1.568.886l3.702 6.4" />
      <path d="m18.024 10.584-1.7-3.143-3.538 1.57" />
    </svg>
  );
}

// Custom / compost / yard waste icon (leaf)
function CustomIcon({ active, color }: { active: boolean; color: string }) {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: active ? 1 : 0.45 }}>
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75" />
    </svg>
  );
}

interface WasteRowProps {
  label: string;
  icon: React.ReactNode;
  scheduleDay: number;
  today: number;
  highlightMode: 'day-of' | 'day-before';
  now: Date;
  frequency: GarbageFrequency;
  startDate: string;
}

function WasteRow({ label, icon, scheduleDay, today, highlightMode, now, frequency, startDate }: WasteRowProps) {
  if (scheduleDay < 0) return null;

  const active = isHighlighted(scheduleDay, today, highlightMode, now, frequency, startDate);
  const status = getStatusText(scheduleDay, today, highlightMode, now, frequency, startDate);
  const nextCollection = !active ? getNextCollectionText(scheduleDay, now, frequency, startDate) : '';
  const frequencyLabel = frequency === 'biweekly' ? 'Every other ' : '';

  return (
    <div
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all"
      style={{
        background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
        border: active ? '1px solid rgba(255,255,255,0.15)' : '1px solid transparent',
      }}
    >
      {icon}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate" style={{ fontSize: '0.95em', opacity: active ? 1 : 0.6 }}>
          {label}
        </p>
        <p style={{ fontSize: '0.75em', opacity: active ? 0.9 : 0.4 }}>
          {frequencyLabel}{DAYS[scheduleDay]}
        </p>
      </div>
      {active ? (
        <span
          className="px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider shrink-0"
          style={{
            fontSize: '0.6em',
            background: 'rgba(255,255,255,0.15)',
            letterSpacing: '0.05em',
          }}
        >
          {status}
        </span>
      ) : nextCollection ? (
        <span className="shrink-0" style={{ fontSize: '0.7em', opacity: 0.4 }}>
          {nextCollection}
        </span>
      ) : null}
    </div>
  );
}

export default function GarbageDayModule({ config, style, timezone }: GarbageDayModuleProps) {
  const now = useTZClock(timezone, 60_000);
  const today = now.getDay(); // 0=Sun, 6=Sat

  const trashDay = config.trashDay ?? -1;
  const recyclingDay = config.recyclingDay ?? -1;
  const customDay = config.customDay ?? -1;
  const customLabel = config.customLabel || 'Yard Waste';
  const highlightMode = config.highlightMode ?? 'day-before';

  return (
    <ModuleWrapper style={style}>
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 mb-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span style={{ fontSize: '0.8em', opacity: 0.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Collection Schedule
          </span>
        </div>

        <div className="flex flex-col gap-1 flex-1 justify-center">
          <WasteRow
            label="Trash"
            icon={<TrashIcon active={isHighlighted(trashDay, today, highlightMode, now, config.trashFrequency ?? 'weekly', config.trashStartDate ?? '')} color={config.trashColor || '#6ee7b7'} />}
            scheduleDay={trashDay}
            today={today}
            highlightMode={highlightMode}
            now={now}
            frequency={config.trashFrequency ?? 'weekly'}
            startDate={config.trashStartDate ?? ''}
          />
          <WasteRow
            label="Recycling"
            icon={<RecyclingIcon active={isHighlighted(recyclingDay, today, highlightMode, now, config.recyclingFrequency ?? 'weekly', config.recyclingStartDate ?? '')} color={config.recyclingColor || '#93c5fd'} />}
            scheduleDay={recyclingDay}
            today={today}
            highlightMode={highlightMode}
            now={now}
            frequency={config.recyclingFrequency ?? 'weekly'}
            startDate={config.recyclingStartDate ?? ''}
          />
          <WasteRow
            label={customLabel}
            icon={<CustomIcon active={isHighlighted(customDay, today, highlightMode, now, config.customFrequency ?? 'weekly', config.customStartDate ?? '')} color={config.customColor || '#fbbf24'} />}
            scheduleDay={customDay}
            today={today}
            highlightMode={highlightMode}
            now={now}
            frequency={config.customFrequency ?? 'weekly'}
            startDate={config.customStartDate ?? ''}
          />
        </div>

        {trashDay < 0 && recyclingDay < 0 && customDay < 0 && (
          <p className="text-center opacity-40" style={{ fontSize: '0.85em' }}>
            Set collection days in module settings
          </p>
        )}
      </div>
    </ModuleWrapper>
  );
}
