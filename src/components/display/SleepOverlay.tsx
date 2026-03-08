'use client';

import type { DisplayState } from '@/hooks/useSleepManager';
import type { ScreensaverSettings } from '@/types/config';
import Screensaver from './Screensaver';

interface SleepOverlayProps {
  displayState: DisplayState;
  dimOpacity: number;
  screensaver?: ScreensaverSettings;
  timezone?: string;
}

/**
 * Full-screen overlay that dims or blacks out the display.
 * Renders above all content. Shows optional screensaver during dimmed state.
 */
export default function SleepOverlay({
  displayState,
  dimOpacity,
  screensaver,
  timezone,
}: SleepOverlayProps) {
  if (displayState === 'active') return null;

  const screensaverMode = screensaver?.mode ?? 'clock';
  const showScreensaver = displayState === 'dimmed' && screensaverMode !== 'off';

  return (
    <>
      {/* Black overlay — opacity controls dimming level */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: '#000',
          opacity: dimOpacity,
          zIndex: 9997,
          transition: 'opacity 1s ease-in-out',
          // Allow clicks through to trigger wake via the activity listener
          pointerEvents: 'none',
        }}
      />

      {/* Screensaver content (above the dim overlay) */}
      {showScreensaver && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998, pointerEvents: 'none' }}>
          <Screensaver mode={screensaverMode} timezone={timezone} />
        </div>
      )}
    </>
  );
}
