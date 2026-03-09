'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { SleepSettings, ScreensaverSettings } from '@/types/config';

export type DisplayState = 'active' | 'dimmed' | 'asleep';

/**
 * Checks whether the current time falls within a schedule window.
 * Handles overnight windows (e.g., 23:00–06:00) correctly.
 */
function isInScheduleWindow(schedule: { startTime: string; endTime: string }): boolean {
  const now = new Date();
  const [startH, startM] = schedule.startTime.split(':').map(Number);
  const [endH, endM] = schedule.endTime.split(':').map(Number);

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    // Same-day window (e.g., 09:00–17:00)
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  } else {
    // Overnight window (e.g., 23:00–06:00)
    return nowMinutes >= startMinutes || nowMinutes < endMinutes;
  }
}

interface UseSleepManagerResult {
  displayState: DisplayState;
  dimOpacity: number;
  wake: () => void;
}

export function useSleepManager(
  sleep?: SleepSettings,
  screensaver?: ScreensaverSettings,
): UseSleepManagerResult {
  const [displayState, setDisplayState] = useState<DisplayState>('active');
  const lastActivityRef = useRef(Date.now());
  const enabled = sleep?.enabled ?? false;

  const wake = useCallback(() => {
    lastActivityRef.current = Date.now();
    setDisplayState('active');
  }, []);

  // Track user activity (mouse, touch, keyboard) for idle detection
  useEffect(() => {
    if (!enabled) return;

    function onActivity() {
      lastActivityRef.current = Date.now();
      setDisplayState((prev) => (prev !== 'active' ? 'active' : prev));
    }

    const events = ['mousemove', 'mousedown', 'touchstart', 'keydown'];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
    };
  }, [enabled]);

  // Timer that checks idle time, dim schedule, and sleep schedule
  useEffect(() => {
    if (!enabled || !sleep) return;

    const dimMs = sleep.dimAfterMinutes * 60 * 1000;
    const sleepMs = sleep.sleepAfterMinutes * 60 * 1000;

    const interval = setInterval(() => {
      // Fixed sleep schedule takes highest priority — force asleep during window
      if (sleep.schedule && isInScheduleWindow(sleep.schedule)) {
        setDisplayState('asleep');
        return;
      }

      // Fixed dim schedule — force dimmed during window (but activity can still wake)
      const inDimWindow = sleep.dimSchedule && isInScheduleWindow(sleep.dimSchedule);

      const idle = Date.now() - lastActivityRef.current;

      if (idle >= dimMs + sleepMs) {
        setDisplayState('asleep');
      } else if (idle >= dimMs || inDimWindow) {
        setDisplayState('dimmed');
      }
      // Don't reset to 'active' here — that's handled by the activity listener
    }, 10_000); // check every 10 seconds

    return () => clearInterval(interval);
  }, [enabled, sleep]);

  // Calculate dim opacity
  const dimOpacity = (() => {
    if (!enabled) return 0;
    switch (displayState) {
      case 'active':
        return 0;
      case 'dimmed':
        // dimBrightness is 0-100 (percentage of brightness to keep)
        // So overlay opacity = 1 - brightness/100
        return 1 - (sleep?.dimBrightness ?? 20) / 100;
      case 'asleep':
        return 1;
    }
  })();

  return { displayState, dimOpacity, wake };
}
