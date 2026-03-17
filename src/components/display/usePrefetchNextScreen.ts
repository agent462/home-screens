'use client';

import { useEffect, useRef } from 'react';
import type { Screen } from '@/types/config';
import { prefetchScreen } from '@/lib/prefetch';

/** Prefetch next screen's module data ~5s before rotation fires.
 *  Uses screenKey (stable string) instead of screens array to avoid
 *  restarting the timer every time useMemo returns a new array reference.
 */
export function usePrefetchNextScreen(
  screens: Screen[],
  screenKey: string,
  currentIndex: number,
  rotationIntervalMs: number,
  displayState: string,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const screensRef = useRef(screens);

  useEffect(() => {
    screensRef.current = screens;
  }, [screens]);

  useEffect(() => {
    if (displayState === 'asleep' || screensRef.current.length <= 1) return;

    const nextIndex = (currentIndex + 1) % screensRef.current.length;
    const delay = Math.max(rotationIntervalMs - 5000, 0);

    timerRef.current = setTimeout(() => {
      prefetchScreen(screensRef.current[nextIndex], new Date());
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [screenKey, currentIndex, rotationIntervalMs, displayState]);
}
