'use client';

import { useEffect, useRef } from 'react';
import type { DisplayCommand } from '@/lib/display-commands';

export interface CommandHandlers {
  wake: () => void;
  sleep: () => void;
  nextScreen: () => void;
  prevScreen: () => void;
  setBrightness: (value: number) => void;
  reload: () => void;
}

const COMMAND_POLL_MS = 3_000;

/**
 * Polls /api/display/commands every 3s and dispatches to handler callbacks.
 * Commands are drained from the server queue on each poll.
 */
export function useDisplayCommands(handlers: CommandHandlers) {
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    let mounted = true;

    async function poll() {
      try {
        const res = await fetch('/api/display/commands');
        if (!res.ok || !mounted) return;
        const { commands } = (await res.json()) as {
          commands: DisplayCommand[];
        };
        if (!Array.isArray(commands)) return;

        for (const cmd of commands) {
          if (!mounted) break;
          switch (cmd.type) {
            case 'wake':
              handlersRef.current.wake();
              break;
            case 'sleep':
              handlersRef.current.sleep();
              break;
            case 'next-screen':
              handlersRef.current.nextScreen();
              break;
            case 'prev-screen':
              handlersRef.current.prevScreen();
              break;
            case 'brightness':
              if (typeof cmd.payload?.value === 'number') {
                handlersRef.current.setBrightness(cmd.payload.value);
              }
              break;
            case 'reload':
              handlersRef.current.reload();
              break;
            // 'alert' — no-op until alert overlay (3.1) is implemented
          }
        }
      } catch {
        // silent — keep polling
      }
    }

    poll();
    const id = setInterval(poll, COMMAND_POLL_MS);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);
}

/**
 * Reports display status to /api/display/status periodically (every 30s)
 * and immediately on significant state changes.
 */
export function useStatusReporter(
  currentScreenIndex: number,
  currentScreenId: string,
  currentScreenName: string,
  screenCount: number,
  activeProfile: string | undefined | null,
  displayState: string,
) {
  const valuesRef = useRef({
    currentScreenIndex,
    currentScreenId,
    currentScreenName,
    screenCount,
    activeProfile,
    displayState,
  });

  useEffect(() => {
    valuesRef.current = {
      currentScreenIndex,
      currentScreenId,
      currentScreenName,
      screenCount,
      activeProfile,
      displayState,
    };
  });

  // Report immediately on significant changes
  const prevKeyRef = useRef('');
  useEffect(() => {
    const key = `${currentScreenIndex}:${screenCount}:${displayState}:${activeProfile}`;
    if (key === prevKeyRef.current) return;
    prevKeyRef.current = key;
    reportStatus(valuesRef.current);
  }, [currentScreenIndex, screenCount, displayState, activeProfile]);

  // Periodic report every 30s for freshness
  useEffect(() => {
    const id = setInterval(() => reportStatus(valuesRef.current), 30_000);
    return () => clearInterval(id);
  }, []);
}

function reportStatus(s: {
  currentScreenIndex: number;
  currentScreenId: string;
  currentScreenName: string;
  screenCount: number;
  activeProfile: string | undefined | null;
  displayState: string;
}) {
  fetch('/api/display/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      currentScreen: {
        index: s.currentScreenIndex,
        id: s.currentScreenId,
        name: s.currentScreenName,
      },
      screenCount: s.screenCount,
      activeProfile: s.activeProfile ?? null,
      displayState: s.displayState,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
}
