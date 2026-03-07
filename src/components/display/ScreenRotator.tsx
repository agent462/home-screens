'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Screen, GlobalSettings } from '@/types/config';
import ScreenRenderer from './ScreenRenderer';

interface ScreenRotatorProps {
  screens: Screen[];
  settings: GlobalSettings;
}

function useBackgroundRotation(screens: Screen[]) {
  // Persist rotating backgrounds across screen mounts, keyed by screen id
  const [backgrounds, setBackgrounds] = useState<Record<string, string>>({});

  useEffect(() => {
    const newIntervals: Record<string, ReturnType<typeof setInterval>> = {};

    for (const screen of screens) {
      const rotation = screen.backgroundRotation;
      if (!rotation?.enabled || !rotation.query) continue;

      async function fetchBg() {
        try {
          const res = await fetch(`/api/unsplash/random?query=${encodeURIComponent(rotation!.query)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.url) {
              setBackgrounds((prev) => ({ ...prev, [screen.id]: data.url }));
            }
          }
        } catch {
          // keep current background on failure
        }
      }

      fetchBg();
      const intervalMs = (rotation.intervalMinutes ?? 60) * 60 * 1000;
      newIntervals[screen.id] = setInterval(fetchBg, intervalMs);
    }

    return () => {
      Object.values(newIntervals).forEach(clearInterval);
    };
  }, [screens]);

  return backgrounds;
}

export default function ScreenRotator({ screens, settings }: ScreenRotatorProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const rotatingBackgrounds = useBackgroundRotation(screens);

  const advance = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % screens.length);
  }, [screens.length]);

  // Clamp currentIndex when screens array shrinks
  useEffect(() => {
    setCurrentIndex((prev) => (prev >= screens.length ? 0 : prev));
  }, [screens.length]);

  useEffect(() => {
    if (screens.length <= 1) return;
    const interval = setInterval(advance, settings.rotationIntervalMs);
    return () => clearInterval(interval);
  }, [advance, settings.rotationIntervalMs, screens.length]);

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
          initial={{ opacity: 0, scale: 0.98 }}
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
    </div>
  );
}
