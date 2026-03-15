import { addDays } from 'date-fns';

/**
 * Parse an event date string, treating date-only strings ("2026-03-22") as
 * local midnight instead of UTC midnight (the JS default for date-only strings).
 *
 * Per the ECMAScript spec, `new Date("2026-03-22")` is parsed as UTC midnight,
 * which becomes the previous day in any timezone west of UTC. Appending
 * "T00:00:00" forces local-time interpretation instead.
 */
export function parseEventDate(dateStr: string): Date {
  if (!dateStr.includes('T')) {
    return new Date(dateStr + 'T00:00:00');
  }
  return new Date(dateStr);
}

/**
 * Compare two CalendarEvent start dates for sorting.
 * Uses parseEventDate to avoid the UTC-midnight bug on date-only strings.
 */
export function compareEventStarts(aStart: string, bStart: string): number {
  return parseEventDate(aStart).getTime() - parseEventDate(bStart).getTime();
}

/**
 * Check whether a calendar event falls on a given day.
 *
 * All-day events use half-open interval overlap: [evStart, evEnd) ∩ [date, date+1).
 * Google Calendar and iCal both use exclusive end dates for all-day events
 * (a single-day event on March 15 has end = March 16).
 */
export function isEventOnDay(
  ev: { start: string; end: string; allDay?: boolean },
  date: Date,
): boolean {
  const evStart = parseEventDate(ev.start);
  if (ev.allDay || !ev.start.includes('T')) {
    const evEnd = parseEventDate(ev.end);
    return evStart < addDays(date, 1) && evEnd > date;
  }
  // Timed events: compare calendar day using date parts (avoids cross-timezone issues)
  return (
    evStart.getFullYear() === date.getFullYear() &&
    evStart.getMonth() === date.getMonth() &&
    evStart.getDate() === date.getDate()
  );
}
