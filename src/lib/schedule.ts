import type { ModuleSchedule } from '@/types/config';

/**
 * Determine whether a module should be visible right now based on its schedule.
 * Returns true if the module has no schedule (always visible).
 */
export function isModuleVisible(schedule: ModuleSchedule | undefined, now: Date): boolean {
  if (!schedule) return true;

  const { daysOfWeek, startTime, endTime, invert } = schedule;

  // Check day-of-week constraint
  const dayMatch = !daysOfWeek || daysOfWeek.length === 0 || daysOfWeek.includes(now.getDay());

  // Check time-of-day constraint
  const timeMatch = isInTimeWindow(startTime, endTime, now);

  const inWindow = dayMatch && timeMatch;
  return invert ? !inWindow : inWindow;
}

function isInTimeWindow(startTime: string | undefined, endTime: string | undefined, now: Date): boolean {
  if (!startTime && !endTime) return true;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const start = parseTime(startTime) ?? 0;       // default: midnight
  const end = parseTime(endTime) ?? 24 * 60;     // default: end of day

  if (start <= end) {
    // Normal window: e.g., 06:00–09:00
    return nowMinutes >= start && nowMinutes < end;
  } else {
    // Overnight window: e.g., 22:00–06:00 (wraps past midnight)
    return nowMinutes >= start || nowMinutes < end;
  }
}

function parseTime(time: string | undefined): number | null {
  if (!time) return null;
  const [h, m] = time.split(':').map(Number);
  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}
