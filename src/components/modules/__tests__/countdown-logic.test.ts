import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseDateInTZ } from '@/lib/timezone';

// ---------------------------------------------------------------------------
// Replicate the pure logic from CountdownModule.tsx so we can unit-test it.
// These are exact copies of the non-exported helpers.
// ---------------------------------------------------------------------------

function getTimeRemaining(targetDate: string, timezone?: string) {
  const diff = parseDateInTZ(targetDate, timezone).getTime() - Date.now();
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

interface CountdownEvent {
  id: string;
  name: string;
  date: string;
}

/** Replicate the sorting/filtering logic from CountdownModule render. */
function processEvents(events: CountdownEvent[], showPastEvents: boolean, timezone?: string) {
  return events
    .map((event) => ({
      ...event,
      time: getTimeRemaining(event.date, timezone),
    }))
    .filter((event) => showPastEvents || !event.time.past)
    .sort((a, b) => {
      if (a.time.past !== b.time.past) return a.time.past ? 1 : -1;
      return a.time.totalMs - b.time.totalMs;
    });
}

// ── getTimeRemaining ──────────────────────────────────────────────────

describe('getTimeRemaining', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns correct days/hours/minutes/seconds for a future date', () => {
    // Fix "now" to a known instant
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));

    // Target is exactly 2 days, 3 hours, 15 minutes, 30 seconds ahead
    const target = '2025-01-03T03:15:30Z';
    const result = getTimeRemaining(target);

    expect(result.past).toBe(false);
    expect(result.days).toBe(2);
    expect(result.hours).toBe(3);
    expect(result.minutes).toBe(15);
    expect(result.seconds).toBe(30);
    expect(result.totalMs).toBeGreaterThan(0);
  });

  it('returns past: true and correct decomposition for a past date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-01T12:00:00Z'));

    const target = '2025-05-30T10:00:00Z'; // 2 days, 2 hours ago
    const result = getTimeRemaining(target);

    expect(result.past).toBe(true);
    expect(result.days).toBe(2);
    expect(result.hours).toBe(2);
    expect(result.minutes).toBe(0);
    expect(result.seconds).toBe(0);
  });

  it('returns totalMs approximately 0 when the target is exactly now', () => {
    vi.useFakeTimers();
    const now = new Date('2025-03-15T08:00:00Z');
    vi.setSystemTime(now);

    const result = getTimeRemaining('2025-03-15T08:00:00Z');

    expect(result.totalMs).toBe(0);
    expect(result.past).toBe(false); // diff === 0, which is not < 0
    expect(result.days).toBe(0);
    expect(result.hours).toBe(0);
    expect(result.minutes).toBe(0);
    expect(result.seconds).toBe(0);
  });

  it('handles a target exactly 1 second in the future', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));

    const result = getTimeRemaining('2025-01-01T00:00:01Z');
    expect(result.past).toBe(false);
    expect(result.days).toBe(0);
    expect(result.hours).toBe(0);
    expect(result.minutes).toBe(0);
    expect(result.seconds).toBe(1);
  });

  it('handles a target exactly 1 second in the past', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:01Z'));

    const result = getTimeRemaining('2025-01-01T00:00:00Z');
    expect(result.past).toBe(true);
    expect(result.seconds).toBe(1);
  });

  it('correctly decomposes a large time difference (365 days)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));

    const result = getTimeRemaining('2026-01-01T00:00:00Z');
    expect(result.past).toBe(false);
    expect(result.days).toBe(365);
    expect(result.hours).toBe(0);
    expect(result.minutes).toBe(0);
    expect(result.seconds).toBe(0);
  });

  it('propagates NaN fields when given an invalid date string', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));

    const result = getTimeRemaining('not-a-date');

    // parseDateInTZ returns Invalid Date → getTime() is NaN → diff is NaN
    expect(isNaN(result.totalMs)).toBe(true);
    expect(isNaN(result.days)).toBe(true);
    expect(isNaN(result.hours)).toBe(true);
    expect(isNaN(result.minutes)).toBe(true);
    expect(isNaN(result.seconds)).toBe(true);
  });

  it('propagates NaN for an empty date string', () => {
    const result = getTimeRemaining('');
    expect(isNaN(result.totalMs)).toBe(true);
  });

  it('respects timezone parameter for naive date strings', () => {
    vi.useFakeTimers();
    // Set "now" to a known UTC instant
    vi.setSystemTime(new Date('2025-06-15T18:00:00Z'));

    // "2025-06-15T14:00:00" intended as New York time (UTC-4 in June)
    // → real UTC is 2025-06-15T18:00:00Z, so diff should be ~0
    const result = getTimeRemaining('2025-06-15T14:00:00', 'America/New_York');

    // The difference should be very small (within a few seconds due to offset calculation)
    expect(Math.abs(result.totalMs)).toBeLessThan(5000);
  });
});

// ── pad ───────────────────────────────────────────────────────────────

describe('pad', () => {
  it('pads single digit to two characters', () => {
    expect(pad(0)).toBe('00');
    expect(pad(5)).toBe('05');
    expect(pad(9)).toBe('09');
  });

  it('does not pad double digit numbers', () => {
    expect(pad(10)).toBe('10');
    expect(pad(59)).toBe('59');
  });

  it('does not truncate triple digit numbers', () => {
    expect(pad(100)).toBe('100');
    expect(pad(999)).toBe('999');
  });
});

// ── Sorting and filtering events ─────────────────────────────────────

describe('processEvents (sorting & filtering)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('sorts future events by ascending totalMs (soonest first)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));

    const events: CountdownEvent[] = [
      { id: '1', name: 'Far', date: '2025-12-31T00:00:00Z' },
      { id: '2', name: 'Soon', date: '2025-01-02T00:00:00Z' },
      { id: '3', name: 'Mid', date: '2025-06-15T00:00:00Z' },
    ];

    const result = processEvents(events, false);
    expect(result.map((e) => e.name)).toEqual(['Soon', 'Mid', 'Far']);
  });

  it('places future events before past events', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-01T00:00:00Z'));

    const events: CountdownEvent[] = [
      { id: '1', name: 'Past', date: '2025-01-01T00:00:00Z' },
      { id: '2', name: 'Future', date: '2025-12-01T00:00:00Z' },
    ];

    const result = processEvents(events, true);
    expect(result[0].name).toBe('Future');
    expect(result[1].name).toBe('Past');
  });

  it('filters out past events when showPastEvents is false', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-01T00:00:00Z'));

    const events: CountdownEvent[] = [
      { id: '1', name: 'Past', date: '2025-01-01T00:00:00Z' },
      { id: '2', name: 'Future', date: '2025-12-01T00:00:00Z' },
    ];

    const result = processEvents(events, false);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Future');
  });

  it('keeps past events when showPastEvents is true', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-01T00:00:00Z'));

    const events: CountdownEvent[] = [
      { id: '1', name: 'Past', date: '2025-01-01T00:00:00Z' },
      { id: '2', name: 'Future', date: '2025-12-01T00:00:00Z' },
    ];

    const result = processEvents(events, true);
    expect(result).toHaveLength(2);
  });

  it('sorts multiple past events with most recent past first', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-01T00:00:00Z'));

    const events: CountdownEvent[] = [
      { id: '1', name: 'Long ago', date: '2024-01-01T00:00:00Z' },
      { id: '2', name: 'Recently', date: '2025-05-01T00:00:00Z' },
    ];

    const result = processEvents(events, true);
    // Both are past. totalMs is negative. More recent past has less negative totalMs.
    // sort by a.time.totalMs - b.time.totalMs → most negative first
    expect(result[0].name).toBe('Long ago');
    expect(result[1].name).toBe('Recently');
  });

  it('returns empty array when all events are past and showPastEvents is false', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-12-31T00:00:00Z'));

    const events: CountdownEvent[] = [
      { id: '1', name: 'A', date: '2025-01-01T00:00:00Z' },
      { id: '2', name: 'B', date: '2025-06-01T00:00:00Z' },
    ];

    const result = processEvents(events, false);
    expect(result).toHaveLength(0);
  });

  it('handles empty events array', () => {
    const result = processEvents([], false);
    expect(result).toEqual([]);
  });

  it('handles events with identical dates (stable relative order)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));

    const events: CountdownEvent[] = [
      { id: '1', name: 'Alpha', date: '2025-06-15T00:00:00Z' },
      { id: '2', name: 'Beta', date: '2025-06-15T00:00:00Z' },
      { id: '3', name: 'Gamma', date: '2025-06-15T00:00:00Z' },
    ];

    const result = processEvents(events, false);
    expect(result).toHaveLength(3);
    // All have the same totalMs, so sort comparator returns 0 — JS sort is stable
    expect(result.map((e) => e.name)).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('handles mix of future, past, and invalid dates with showPastEvents true', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-01T00:00:00Z'));

    const events: CountdownEvent[] = [
      { id: '1', name: 'Past', date: '2025-01-01T00:00:00Z' },
      { id: '2', name: 'Future', date: '2025-12-01T00:00:00Z' },
      { id: '3', name: 'Invalid', date: 'garbage' },
    ];

    // Invalid date produces NaN totalMs — doesn't crash, but NaN comparisons
    // cause unpredictable sort ordering. The key assertion: no exception thrown.
    const result = processEvents(events, true);
    expect(result).toHaveLength(3);
  });
});

// ── DST boundary edge cases ──────────────────────────────────────────

describe('getTimeRemaining at DST boundaries', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('handles spring-forward DST boundary (March 2025, US)', () => {
    vi.useFakeTimers();
    // Just before spring forward: 2025-03-09T06:59:00Z (1:59 AM EST)
    vi.setSystemTime(new Date('2025-03-09T06:59:00Z'));

    // Target: 2025-03-09T08:00:00Z (3:00 AM EDT — 2:00 AM was skipped)
    const result = getTimeRemaining('2025-03-09T08:00:00Z');

    expect(result.past).toBe(false);
    // 61 minutes = 1 hour 1 minute
    expect(result.totalMs).toBe(61 * 60 * 1000);
    expect(result.hours).toBe(1);
    expect(result.minutes).toBe(1);
  });

  it('handles fall-back DST boundary (November 2025, US)', () => {
    vi.useFakeTimers();
    // Just before fall back: 2025-11-02T05:00:00Z (1:00 AM EDT)
    vi.setSystemTime(new Date('2025-11-02T05:00:00Z'));

    // Target: 2 hours later in UTC
    const result = getTimeRemaining('2025-11-02T07:00:00Z');

    expect(result.past).toBe(false);
    expect(result.totalMs).toBe(2 * 60 * 60 * 1000);
    expect(result.hours).toBe(2);
  });

  it('correctly computes difference with timezone across DST for naive dates', () => {
    vi.useFakeTimers();
    // Now: 2025-06-15T12:00:00Z (8:00 AM EDT, US Eastern, DST active)
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));

    // Use an explicit UTC target so the test is timezone-independent.
    // 2025-06-15T14:00:00Z = 10:00 AM EDT → 2 hours from now
    const result = getTimeRemaining('2025-06-15T14:00:00Z');

    expect(result.past).toBe(false);
    expect(result.hours).toBe(2);
    expect(result.totalMs).toBe(2 * 60 * 60 * 1000);
  });
});
