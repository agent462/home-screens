'use client';

import { useCallback } from 'react';
import type { SleepSettings } from '@/types/config';
import { useSleepManager } from '@/hooks/useSleepManager';
import { useDisplayCommands, useStatusReporter } from '@/hooks/useDisplayCommands';

interface UseDisplayControlParams {
  sleep: SleepSettings | undefined;
  screenIndex: number;
  screenId: string;
  screenName: string;
  screenCount: number;
  activeProfile: string | undefined | null;
  nextScreen: () => void;
  prevScreen: () => void;
  resetRotation: () => void;
}

export function useDisplayControl({
  sleep,
  screenIndex,
  screenId,
  screenName,
  screenCount,
  activeProfile,
  nextScreen,
  prevScreen,
  resetRotation,
}: UseDisplayControlParams) {
  const { displayState, dimOpacity, wake, forceSleep, setRemoteBrightness } = useSleepManager(sleep);

  const remoteNext = useCallback(() => {
    nextScreen();
    resetRotation();
  }, [nextScreen, resetRotation]);

  const remotePrev = useCallback(() => {
    prevScreen();
    resetRotation();
  }, [prevScreen, resetRotation]);

  const reload = useCallback(() => {
    window.location.reload();
  }, []);

  useDisplayCommands({
    wake,
    sleep: forceSleep,
    nextScreen: remoteNext,
    prevScreen: remotePrev,
    setBrightness: setRemoteBrightness,
    reload,
  });

  useStatusReporter(
    screenIndex,
    screenId,
    screenName,
    screenCount,
    activeProfile,
    displayState,
  );

  return { displayState, dimOpacity };
}
