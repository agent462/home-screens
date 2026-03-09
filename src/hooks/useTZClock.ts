'use client';

import { useState, useEffect } from 'react';
import { createTZDate } from '@/lib/timezone';

export function useTZClock(timezone: string | undefined, intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => createTZDate(timezone));
  useEffect(() => {
    const interval = setInterval(() => setNow(createTZDate(timezone)), intervalMs);
    return () => clearInterval(interval);
  }, [timezone, intervalMs]);
  return now;
}
