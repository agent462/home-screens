'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Screen, GlobalSettings, ScreenConfiguration } from '@/types/config';
import ScreenRenderer from './ScreenRenderer';
import SleepOverlay from './SleepOverlay';
import { useSleepManager } from '@/hooks/useSleepManager';

/** How often the display polls for config changes (ms) */
const CONFIG_POLL_MS = 3_000;

interface ScreenRotatorProps {
  screens: Screen[];
  settings: GlobalSettings;
}

/** How often the client polls the server-side rotation cache (ms) */
const BG_POLL_MS = 60_000;

function useBackgroundRotation(screens: Screen[]) {
  // Persist rotating backgrounds across screen mounts, keyed by screen id
  const [backgrounds, setBackgrounds] = useState<Record<string, string>>({});

  // Build a stable key from only the rotation-relevant config so we don't
  // restart polling when unrelated screen fields change.
  const rotationKey = screens
    .filter((s) => s.backgroundRotation?.enabled)
    .map((s) => `${s.id}:${s.backgroundRotation!.query}:${s.backgroundRotation!.intervalMinutes}`)
    .join('|');

  useEffect(() => {
    if (!rotationKey) return;

    const screensWithRotation = screens.filter((s) => s.backgroundRotation?.enabled);

    async function pollBackgrounds() {
      for (const screen of screensWithRotation) {
        try {
          const res = await fetch(`/api/backgrounds/rotate?screenId=${encodeURIComponent(screen.id)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.path) {
              setBackgrounds((prev) => {
                if (prev[screen.id] === data.path) return prev;
                return { ...prev, [screen.id]: data.path };
              });
            }
          }
        } catch {
          // keep current background on failure
        }
      }
    }

    pollBackgrounds();
    const id = setInterval(pollBackgrounds, BG_POLL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotationKey]);

  return backgrounds;
}

/**
 * Poll /api/config and return live screens + settings, falling back to
 * the server-rendered props until the first successful fetch.
 */
function useLiveConfig(initialScreens: Screen[], initialSettings: GlobalSettings) {
  const [screens, setScreens] = useState(initialScreens);
  const [settings, setSettings] = useState(initialSettings);
  const configJsonRef = useRef<string>('');
  const buildIdRef = useRef<string>('');

  useEffect(() => {
    let mounted = true;

    async function poll() {
      try {
        // Check for new build — reload the page if the server was redeployed
        const buildRes = await fetch('/api/system/build-id');
        if (buildRes.ok && mounted) {
          const newBuildId = await buildRes.text();
          if (buildIdRef.current && newBuildId !== buildIdRef.current) {
            window.location.reload();
            return;
          }
          buildIdRef.current = newBuildId;
        }

        const res = await fetch('/api/config');
        if (!res.ok || !mounted) return;
        const text = await res.text();
        // Only update state when the JSON actually changed
        if (text !== configJsonRef.current) {
          configJsonRef.current = text;
          const cfg: ScreenConfiguration = JSON.parse(text);
          if (cfg.screens && cfg.settings) {
            setScreens(cfg.screens);
            setSettings(cfg.settings);
          }
        }
      } catch {
        // keep current config on failure
      }
    }

    poll();
    const id = setInterval(poll, CONFIG_POLL_MS);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  return { screens, settings };
}

export default function ScreenRotator({ screens: initialScreens, settings: initialSettings }: ScreenRotatorProps) {
  const { screens, settings } = useLiveConfig(initialScreens, initialSettings);
  const [currentIndex, setCurrentIndex] = useState(0);
  const rotatingBackgrounds = useBackgroundRotation(screens);
  const { displayState, dimOpacity } = useSleepManager(settings.sleep, settings.screensaver);

  const advance = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % screens.length);
  }, [screens.length]);

  // Clamp currentIndex when screens array shrinks
  useEffect(() => {
    setCurrentIndex((prev) => (prev >= screens.length ? 0 : prev));
  }, [screens.length]);

  // Pause screen rotation when display is asleep (no point cycling invisible screens)
  useEffect(() => {
    if (screens.length <= 1 || displayState === 'asleep') return;
    const interval = setInterval(advance, settings.rotationIntervalMs);
    return () => clearInterval(interval);
  }, [advance, settings.rotationIntervalMs, screens.length, displayState]);

  if (screens.length === 0) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
        No screens configured
      </div>
    );
  }

  const safeIndex = currentIndex < screens.length ? currentIndex : 0;
  const screen = screens[safeIndex];

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#000' }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={screen.id}
          initial={false}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        >
          <ScreenRenderer screen={screen} settings={settings} rotatingBackground={rotatingBackgrounds[screen.id]} />
        </motion.div>
      </AnimatePresence>

      {screens.length > 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 8,
            zIndex: 100,
          }}
        >
          {screens.map((s, i) => (
            <div
              key={s.id}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: i === safeIndex ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)',
                transition: 'background-color 0.3s',
              }}
            />
          ))}
        </div>
      )}

      <SleepOverlay
        displayState={displayState}
        dimOpacity={dimOpacity}
        screensaver={settings.screensaver}
        timezone={settings.timezone}
      />
    </div>
  );
}
