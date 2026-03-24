import { parseDateInTZ } from '@/lib/timezone';
import type { CountdownEvent } from '@/types/config';
import type { TimeRemaining, ProcessedEvent } from './types';

export function getTimeRemaining(targetDate: string, timezone?: string): TimeRemaining {
  const diff = parseDateInTZ(targetDate, timezone).getTime() - Date.now();
  const absDiff = Math.abs(diff);
  const past = diff < 0;

  const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((absDiff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, past, totalMs: diff };
}

export function pad(n: number) {
  return String(n).padStart(2, '0');
}

/**
 * For recurring yearly events, resolve the date to the next occurrence.
 * If the stored month/day has already passed this year, advance to next year.
 * Resolution is at render time — the stored date is never mutated.
 *
 * We parse month/day/time directly from the stored date string (not from a
 * Date object) to avoid timezone-dependent extraction. The string contains the
 * user's intended calendar values; timezone only matters for the "has it
 * passed" check, which getTimeRemaining handles via parseDateInTZ.
 */
export function resolveEventDate(event: CountdownEvent, timezone?: string): string {
  if (event.recurring !== 'yearly') return event.date;

  // Extract month/day/time from the stored string (e.g. "2025-12-25T00:00")
  const match = event.date.match(/(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!match) return event.date;

  const month = parseInt(match[2], 10); // 1-12
  const day = parseInt(match[3], 10);
  const hours = parseInt(match[4] ?? '0', 10);
  const minutes = parseInt(match[5] ?? '0', 10);

  // Determine the current year in the configured timezone
  const now = timezone ? createTZDateFromTimezone(timezone) : new Date();
  const currentYear = now.getFullYear();

  // Build candidate date for this year and check if it's still upcoming
  const thisYearStr = formatDateStr(currentYear, month, day, hours, minutes);
  const thisYearMs = parseDateInTZ(thisYearStr, timezone).getTime();
  if (thisYearMs >= Date.now()) {
    return thisYearStr;
  }

  // Already passed this year — use next year
  return formatDateStr(currentYear + 1, month, day, hours, minutes);
}

/** Get the current date/time in a specific timezone */
function createTZDateFromTimezone(timezone: string): Date {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', hour12: false,
    }).formatToParts(new Date());
    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);
    const hour = get('hour') === 24 ? 0 : get('hour');
    return new Date(get('year'), get('month') - 1, get('day'), hour, get('minute'));
  } catch {
    return new Date();
  }
}

function formatDateStr(year: number, month: number, day: number, hours: number, minutes: number): string {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  const h = String(hours).padStart(2, '0');
  const min = String(minutes).padStart(2, '0');
  return `${year}-${m}-${d}T${h}:${min}`;
}

export function processEvents(
  events: CountdownEvent[],
  showPastEvents: boolean,
  timezone?: string,
): ProcessedEvent[] {
  return events
    .map((event) => ({
      ...event,
      time: getTimeRemaining(resolveEventDate(event, timezone), timezone),
    }))
    .filter((event) => showPastEvents || !event.time.past)
    .sort((a, b) => {
      if (a.time.past !== b.time.past) return a.time.past ? 1 : -1;
      return a.time.totalMs - b.time.totalMs;
    });
}
