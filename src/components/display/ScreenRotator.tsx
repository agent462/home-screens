'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Screen, GlobalSettings, ScreenConfiguration, Profile } from '@/types/config';
import ScreenRenderer, { resolveProvider } from './ScreenRenderer';
import type { SharedDisplayData } from './ScreenRenderer';
import SleepOverlay from './SleepOverlay';
import { useSleepManager } from '@/hooks/useSleepManager';
import { useDisplayCommands, useStatusReporter } from '@/hooks/useDisplayCommands';
import { useFetchData } from '@/hooks/useFetchData';
import { useTZClock } from '@/hooks/useTZClock';
import { resolveProfileScreens } from '@/lib/schedule';
import { getTransitionVariants } from '@/lib/transitions';
import { WEATHER_REFRESH_MS, CALENDAR_REFRESH_MS, DEFAULT_DISPLAY_WIDTH, DEFAULT_DISPLAY_HEIGHT } from '@/lib/constants';
import { displayCache } from '@/lib/display-cache';
import { prefetchScreen } from '@/lib/prefetch';
import { useIdleCursor } from '@/hooks/useIdleCursor';

/** How often the display polls for config changes (ms) */
const CONFIG_POLL_MS = 3_000;

interface ScreenRotatorProps {
  screens: Screen[];
  settings: GlobalSettings;
  profiles?: Profile[];
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
    .map((s) => `${s.id}:${s.backgroundRotation!.source || 'unsplash'}:${s.backgroundRotation!.query}:${s.backgroundRotation!.intervalMinutes}`)
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
 * Poll /api/config and return live screens + settings + profiles,
 * falling back to the server-rendered props until the first successful fetch.
 */
function useLiveConfig(initialScreens: Screen[], initialSettings: GlobalSettings, initialProfiles?: Profile[]) {
  const [screens, setScreens] = useState(initialScreens);
  const [settings, setSettings] = useState(initialSettings);
  const [profiles, setProfiles] = useState(initialProfiles);
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
          displayCache.clear(); // invalidate client cache on config change
          const cfg: ScreenConfiguration = JSON.parse(text);
          if (cfg.screens && cfg.settings) {
            setScreens(cfg.screens);
            setSettings(cfg.settings);
            setProfiles(cfg.profiles);
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

  return { screens, settings, profiles };
}

/** Fetch weather + calendar data once, shared across all screen rotations. */
function useSharedDisplayData(screens: Screen[], settings: GlobalSettings): SharedDisplayData {
  const globalProvider = settings.weather.provider;
  const lat = settings.latitude ?? settings.weather.latitude;
  const lon = settings.longitude ?? settings.weather.longitude;
  const baseParams = `lat=${lat}&lon=${lon}&units=${settings.weather.units}`;

  // Determine which weather providers are needed across ALL screens
  const { needsOWM, needsWAPI, needsPirate, needsNOAA, needsOpenMeteo } = useMemo(() => {
    let owm = false;
    let wapi = false;
    let pirate = false;
    let noaa = false;
    let openMeteo = false;
    for (const screen of screens) {
      for (const mod of screen.modules) {
        if (mod.type === 'weather') {
          const p = resolveProvider(mod, globalProvider);
          if (p === 'openweathermap') owm = true;
          if (p === 'weatherapi') wapi = true;
          if (p === 'pirateweather') pirate = true;
          if (p === 'noaa') noaa = true;
          if (p === 'open-meteo') openMeteo = true;
        }
      }
    }
    return { needsOWM: owm, needsWAPI: wapi, needsPirate: pirate, needsNOAA: noaa, needsOpenMeteo: openMeteo };
  }, [screens, globalProvider]);

  const owmUrl = needsOWM ? `/api/weather?${baseParams}&provider=openweathermap` : '';
  const wapiUrl = needsWAPI ? `/api/weather?${baseParams}&provider=weatherapi` : '';
  const pirateUrl = needsPirate ? `/api/weather?${baseParams}&provider=pirateweather` : '';
  const noaaUrl = needsNOAA ? `/api/weather?${baseParams}&provider=noaa` : '';
  const openMeteoUrl = needsOpenMeteo ? `/api/weather?${baseParams}&provider=open-meteo` : '';
  const [owmData] = useFetchData(owmUrl, WEATHER_REFRESH_MS);
  const [wapiData] = useFetchData(wapiUrl, WEATHER_REFRESH_MS);
  const [pirateData] = useFetchData(pirateUrl, WEATHER_REFRESH_MS);
  const [noaaData] = useFetchData(noaaUrl, WEATHER_REFRESH_MS);
  const [openMeteoData] = useFetchData(openMeteoUrl, WEATHER_REFRESH_MS);

  const calendarIdList = settings.calendar.googleCalendarIds?.length
    ? settings.calendar.googleCalendarIds
    : settings.calendar.googleCalendarId ? [settings.calendar.googleCalendarId] : [];
  const hasIcalSources = settings.calendar.icalSources?.some(s => s.enabled);
  const calendarUrl = (calendarIdList.length || hasIcalSources)
    ? calendarIdList.length
      ? `/api/calendar?calendarIds=${encodeURIComponent(calendarIdList.join(','))}`
      : '/api/calendar'
    : '';
  const [calendarData] = useFetchData(calendarUrl, CALENDAR_REFRESH_MS);

  return { owmData, wapiData, pirateData, noaaData, openMeteoData, calendarData };
}

/** Prefetch next screen's module data ~5s before rotation fires.
 *  Uses screenKey (stable string) instead of screens array to avoid
 *  restarting the timer every time useMemo returns a new array reference.
 */
function usePrefetchNextScreen(
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

export default function ScreenRotator({ screens: initialScreens, settings: initialSettings, profiles: initialProfiles }: ScreenRotatorProps) {
  const { screens: allScreens, settings, profiles } = useLiveConfig(initialScreens, initialSettings, initialProfiles);
  const cursorRef = useIdleCursor(settings.cursorHideSeconds ?? 3);
  const [currentIndex, setCurrentIndex] = useState(0);
  // Bumped on manual navigation to reset the auto-rotation timer
  const [rotationEpoch, setRotationEpoch] = useState(0);
  const { displayState, dimOpacity, wake, forceSleep, setRemoteBrightness } = useSleepManager(settings.sleep);
  // Shared data needs all screens (for weather provider detection), not just active profile screens
  const sharedData = useSharedDisplayData(allScreens, settings);

  // Viewport measurement lives here (not in ScreenRenderer) so it persists across screen transitions
  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    function update() {
      setViewportSize({ w: window.innerWidth, h: window.innerHeight });
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const displayW = settings.displayWidth || DEFAULT_DISPLAY_WIDTH;
  const displayH = settings.displayHeight || DEFAULT_DISPLAY_HEIGHT;
  const scale = viewportSize.w > 0
    ? Math.min(viewportSize.w / displayW, viewportSize.h / displayH)
    : 0; // Start at 0 (invisible) until measured, preventing unscaled flash

  // Re-evaluate profile schedule every minute (timezone-aware)
  const now = useTZClock(settings.timezone, 60_000);
  const screens = useMemo(
    () => resolveProfileScreens(allScreens, profiles, settings.activeProfile, now),
    [allScreens, profiles, settings.activeProfile, now],
  );

  // Only poll background rotation for screens visible under the active profile
  const rotatingBackgrounds = useBackgroundRotation(screens);

  // Stable key derived from resolved screen IDs — changes only when actual set changes
  const screenKey = screens.map((s) => s.id).join(',');

  // Prefetch next screen's API data before rotation fires
  usePrefetchNextScreen(screens, screenKey, currentIndex, settings.rotationIntervalMs, displayState);

  // Compute safeIndex early so command/status hooks can use it
  const safeIndex = currentIndex < screens.length ? currentIndex : 0;
  const currentScreen = screens[safeIndex];

  const goToScreen = useCallback((index: number) => {
    setCurrentIndex(index);
    setRotationEpoch((e) => e + 1);
  }, []);

  const nextScreen = useCallback(() => {
    if (screens.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % screens.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screens.length, screenKey]);

  const prevScreen = useCallback(() => {
    if (screens.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + screens.length) % screens.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screens.length, screenKey]);

  const reload = useCallback(() => {
    window.location.reload();
  }, []);

  // Reset currentIndex when the active screen set changes (handles both
  // length changes and same-length profile switches with different screens)
  useEffect(() => {
    setCurrentIndex(0);
  }, [screenKey]);

  // Pause screen rotation when display is asleep (no point cycling invisible screens).
  // rotationEpoch resets the timer after manual navigation (dot click, remote command).
  useEffect(() => {
    if (screens.length <= 1 || displayState === 'asleep') return;
    const interval = setInterval(nextScreen, settings.rotationIntervalMs);
    return () => clearInterval(interval);
  }, [nextScreen, settings.rotationIntervalMs, screens.length, displayState, rotationEpoch]);

  // Wrap next/prev so remote-triggered navigation also resets the rotation timer.
  const remoteNext = useCallback(() => { nextScreen(); setRotationEpoch((e) => e + 1); }, [nextScreen]);
  const remotePrev = useCallback(() => { prevScreen(); setRotationEpoch((e) => e + 1); }, [prevScreen]);

  // Remote control — poll for commands from /api/display/commands
  useDisplayCommands({
    wake,
    sleep: forceSleep,
    nextScreen: remoteNext,
    prevScreen: remotePrev,
    setBrightness: setRemoteBrightness,
    reload,
  });

  // Report display status to /api/display/status
  useStatusReporter(
    safeIndex,
    currentScreen?.id ?? '',
    currentScreen?.name ?? '',
    screens.length,
    settings.activeProfile,
    displayState,
  );

  const tv = getTransitionVariants(settings.transitionEffect, settings.transitionDuration);
  const firstRender = useRef(true);
  useEffect(() => { firstRender.current = false; }, []);

  if (screens.length === 0) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
        No screens configured
      </div>
    );
  }

  return (
    <div ref={cursorRef} style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', perspective: settings.transitionEffect === 'flip' ? 1200 : undefined }}>
      <AnimatePresence mode={tv.mode}>
        <motion.div
          key={currentScreen.id}
          initial={firstRender.current ? false : tv.initial}
          animate={tv.animate}
          exit={tv.exit}
          transition={tv.transition}
          style={tv.mode === 'sync' ? { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' } : undefined}
        >
          <ScreenRenderer screen={currentScreen} settings={settings} rotatingBackground={rotatingBackgrounds[currentScreen.id]} sharedData={sharedData} displayW={displayW} displayH={displayH} scale={scale} />
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
            <button
              key={s.id}
              onClick={() => goToScreen(i)}
              style={{
                width: 20,
                height: 20,
                padding: 0,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: i === safeIndex ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)',
                  transition: 'background-color 0.3s',
                  display: 'block',
                }}
              />
            </button>
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
