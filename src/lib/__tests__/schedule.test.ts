import { describe, it, expect } from 'vitest';
import { isModuleVisible } from '../schedule';

// Helper: create a Date for a specific day/time
// day: 0=Sun, 1=Mon, ... 6=Sat
function makeDate(day: number, hours: number, minutes: number): Date {
  // 2026-03-08 is a Sunday (day 0)
  const d = new Date(2026, 2, 8 + day, hours, minutes);
  return d;
}

describe('isModuleVisible', () => {
  it('returns true when no schedule is set', () => {
    expect(isModuleVisible(undefined, new Date())).toBe(true);
  });

  it('returns true when schedule is empty object', () => {
    expect(isModuleVisible({}, new Date())).toBe(true);
  });

  // Day-of-week filtering
  describe('daysOfWeek', () => {
    it('shows module on matching day', () => {
      const monday = makeDate(1, 12, 0);
      expect(isModuleVisible({ daysOfWeek: [1, 2, 3, 4, 5] }, monday)).toBe(true);
    });

    it('hides module on non-matching day', () => {
      const sunday = makeDate(0, 12, 0);
      expect(isModuleVisible({ daysOfWeek: [1, 2, 3, 4, 5] }, sunday)).toBe(false);
    });

    it('treats empty daysOfWeek as every day', () => {
      const sunday = makeDate(0, 12, 0);
      expect(isModuleVisible({ daysOfWeek: [] }, sunday)).toBe(true);
    });
  });

  // Time window filtering
  describe('time window', () => {
    it('shows module within time window', () => {
      const at7am = makeDate(1, 7, 0);
      expect(isModuleVisible({ startTime: '06:00', endTime: '09:00' }, at7am)).toBe(true);
    });

    it('hides module outside time window', () => {
      const at10am = makeDate(1, 10, 0);
      expect(isModuleVisible({ startTime: '06:00', endTime: '09:00' }, at10am)).toBe(false);
    });

    it('endTime is exclusive', () => {
      const at9am = makeDate(1, 9, 0);
      expect(isModuleVisible({ startTime: '06:00', endTime: '09:00' }, at9am)).toBe(false);
    });

    it('handles startTime only (until end of day)', () => {
      const at11pm = makeDate(1, 23, 0);
      expect(isModuleVisible({ startTime: '18:00' }, at11pm)).toBe(true);

      const at5am = makeDate(1, 5, 0);
      expect(isModuleVisible({ startTime: '18:00' }, at5am)).toBe(false);
    });

    it('handles endTime only (from midnight)', () => {
      const at5am = makeDate(1, 5, 0);
      expect(isModuleVisible({ endTime: '09:00' }, at5am)).toBe(true);

      const at10am = makeDate(1, 10, 0);
      expect(isModuleVisible({ endTime: '09:00' }, at10am)).toBe(false);
    });

    it('handles overnight window (e.g., 22:00-06:00)', () => {
      const at11pm = makeDate(1, 23, 0);
      const at2am = makeDate(2, 2, 0);
      const at10am = makeDate(1, 10, 0);

      const schedule = { startTime: '22:00', endTime: '06:00' };
      expect(isModuleVisible(schedule, at11pm)).toBe(true);
      expect(isModuleVisible(schedule, at2am)).toBe(true);
      expect(isModuleVisible(schedule, at10am)).toBe(false);
    });
  });

  // Combined day + time
  describe('day + time combined', () => {
    it('requires both day and time to match', () => {
      const mondayAt7am = makeDate(1, 7, 0);
      const sundayAt7am = makeDate(0, 7, 0);
      const mondayAt10am = makeDate(1, 10, 0);

      const schedule = { daysOfWeek: [1, 2, 3, 4, 5], startTime: '06:00', endTime: '09:00' };
      expect(isModuleVisible(schedule, mondayAt7am)).toBe(true);
      expect(isModuleVisible(schedule, sundayAt7am)).toBe(false);
      expect(isModuleVisible(schedule, mondayAt10am)).toBe(false);
    });
  });

  // Edge cases
  describe('edge cases', () => {
    it('startTime is inclusive', () => {
      const atExact6am = makeDate(1, 6, 0);
      expect(isModuleVisible({ startTime: '06:00', endTime: '09:00' }, atExact6am)).toBe(true);
    });

    it('handles Saturday (day 6)', () => {
      const saturday = makeDate(6, 12, 0);
      expect(isModuleVisible({ daysOfWeek: [6] }, saturday)).toBe(true);
      expect(isModuleVisible({ daysOfWeek: [0, 1, 2, 3, 4, 5] }, saturday)).toBe(false);
    });

    it('equal start and end time produces zero-width window (always hidden)', () => {
      const at6am = makeDate(1, 6, 0);
      const at12pm = makeDate(1, 12, 0);
      expect(isModuleVisible({ startTime: '06:00', endTime: '06:00' }, at6am)).toBe(false);
      expect(isModuleVisible({ startTime: '06:00', endTime: '06:00' }, at12pm)).toBe(false);
    });

    it('rejects out-of-range times (treats as no constraint)', () => {
      const at12pm = makeDate(1, 12, 0);
      // Invalid times should be parsed as null, falling back to defaults
      expect(isModuleVisible({ startTime: '25:00', endTime: '09:00' }, at12pm)).toBe(false);
      expect(isModuleVisible({ startTime: '06:00', endTime: '25:00' }, at12pm)).toBe(true);
    });

    it('invert with no constraints hides always', () => {
      expect(isModuleVisible({ invert: true }, makeDate(1, 12, 0))).toBe(false);
      expect(isModuleVisible({ invert: true }, makeDate(0, 0, 0))).toBe(false);
    });

    it('overnight window + daysOfWeek checks current calendar day (known limitation)', () => {
      // Saturday-only schedule with overnight window 22:00–06:00
      // At Saturday 23:00 → day=6 matches, time matches → visible
      const saturdayAt11pm = makeDate(6, 23, 0);
      const schedule = { daysOfWeek: [6], startTime: '22:00', endTime: '06:00' };
      expect(isModuleVisible(schedule, saturdayAt11pm)).toBe(true);

      // At Sunday 02:00 → day=0 doesn't match [6] → NOT visible
      // This is a known limitation: the post-midnight portion of an overnight
      // window uses the new calendar day, not the day the window started.
      // Workaround: include both days in daysOfWeek (e.g., [6, 0]).
      const sundayAt2am = makeDate(0, 2, 0);
      expect(isModuleVisible(schedule, sundayAt2am)).toBe(false);
    });
  });

  // Invert
  describe('invert', () => {
    it('hides module during window when inverted', () => {
      const mondayAt7am = makeDate(1, 7, 0);
      const schedule = { daysOfWeek: [1, 2, 3, 4, 5], startTime: '06:00', endTime: '09:00', invert: true };
      expect(isModuleVisible(schedule, mondayAt7am)).toBe(false);
    });

    it('shows module outside window when inverted', () => {
      const mondayAt10am = makeDate(1, 10, 0);
      const schedule = { daysOfWeek: [1, 2, 3, 4, 5], startTime: '06:00', endTime: '09:00', invert: true };
      expect(isModuleVisible(schedule, mondayAt10am)).toBe(true);
    });

    it('shows module on non-matching day when inverted', () => {
      const sundayAt7am = makeDate(0, 7, 0);
      const schedule = { daysOfWeek: [1, 2, 3, 4, 5], startTime: '06:00', endTime: '09:00', invert: true };
      expect(isModuleVisible(schedule, sundayAt7am)).toBe(true);
    });
  });
});
