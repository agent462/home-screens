'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useEditorStore } from '@/stores/editor-store';
import type { GlobalSettings } from '@/types/config';
import {
  ArrowLeft,
  Monitor,
  Moon,
  MapPin,
  CloudSun,
  Calendar,
  Plug,
  Server,
  Database,
  Shield,
  Layers,
  Activity,
} from 'lucide-react';

import HomeScreensLogo from '@/components/brand/HomeScreensLogo';
import Button from '@/components/ui/Button';
import DisplaySection from '@/components/editor/settings/DisplaySection';
import SleepSection from '@/components/editor/settings/SleepSection';
import LocationSection from '@/components/editor/settings/LocationSection';
import WeatherSection from '@/components/editor/settings/WeatherSection';
import IntegrationsSection from '@/components/editor/settings/IntegrationsSection';
import CalendarSection from '@/components/editor/settings/CalendarSection';
import ProfilesSection from '@/components/editor/settings/ProfilesSection';
import SystemSection from '@/components/editor/settings/SystemSection';
import SecuritySection from '@/components/editor/settings/SecuritySection';
import StatsSection from '@/components/editor/settings/StatsSection';
import DataSection from '@/components/editor/settings/DataSection';
import UpgradeModal from '@/components/editor/UpgradeModal';

/* ─── Tab definitions ─────────────────────────────── */

const TABS = [
  { id: 'display', label: 'Display', icon: Monitor },
  { id: 'profiles', label: 'Profiles', icon: Layers },
  { id: 'sleep', label: 'Sleep', icon: Moon },
  { id: 'location', label: 'Location', icon: MapPin },
  { id: 'weather', label: 'Weather', icon: CloudSun },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'data', label: 'Data', icon: Database },
  { id: 'stats', label: 'Stats', icon: Activity },
  { id: 'system', label: 'System', icon: Server },
] as const;

type TabId = (typeof TABS)[number]['id'];

/* ─── Settings state ──────────────────────────────── */

interface SettingsState {
  provider: string;
  lat: string;
  lon: string;
  units: string;
  locationName: string | null;
  selectedCalendarIds: string[];
  icalSources: import('@/types/config').ICalSource[];
  maxEvents: number;
  daysAhead: number;
  rotationInterval: number;
  displayWidth: number;
  displayHeight: number;
  displayTransform: string;
  timezone: string;
  sleepEnabled: boolean;
  dimAfterMinutes: number;
  sleepAfterMinutes: number;
  dimBrightness: number;
  dimScheduleEnabled: boolean;
  dimStartTime: string;
  dimEndTime: string;
  sleepScheduleEnabled: boolean;
  sleepStartTime: string;
  sleepEndTime: string;
  screensaverMode: string;
  cursorHideSeconds: number;
  transitionEffect: string;
  transitionDuration: number;
}

function initSettings(settings: GlobalSettings | undefined): SettingsState {
  return {
    provider: settings?.weather.provider ?? 'weatherapi',
    lat: (settings?.latitude ?? settings?.weather.latitude)?.toString() ?? '',
    lon: (settings?.longitude ?? settings?.weather.longitude)?.toString() ?? '',
    units: settings?.weather.units ?? 'imperial',
    locationName: settings?.locationName ?? null,
    selectedCalendarIds:
      settings?.calendar.googleCalendarIds ??
      (settings?.calendar.googleCalendarId ? [settings.calendar.googleCalendarId] : []),
    icalSources: settings?.calendar.icalSources ?? [],
    maxEvents: settings?.calendar.maxEvents ?? 10,
    daysAhead: settings?.calendar.daysAhead ?? 7,
    rotationInterval: (settings?.rotationIntervalMs ?? 30000) / 1000,
    displayWidth: settings?.displayWidth ?? 1080,
    displayHeight: settings?.displayHeight ?? 1920,
    displayTransform: settings?.displayTransform ?? '90',
    timezone: settings?.timezone ?? '',
    sleepEnabled: settings?.sleep?.enabled ?? false,
    dimAfterMinutes: settings?.sleep?.dimAfterMinutes ?? 10,
    sleepAfterMinutes: settings?.sleep?.sleepAfterMinutes ?? 0,
    dimBrightness: settings?.sleep?.dimBrightness ?? 20,
    dimScheduleEnabled: !!settings?.sleep?.dimSchedule,
    dimStartTime: settings?.sleep?.dimSchedule?.startTime ?? '23:00',
    dimEndTime: settings?.sleep?.dimSchedule?.endTime ?? '06:00',
    sleepScheduleEnabled: !!settings?.sleep?.schedule,
    sleepStartTime: settings?.sleep?.schedule?.startTime ?? '23:00',
    sleepEndTime: settings?.sleep?.schedule?.endTime ?? '06:00',
    screensaverMode: settings?.screensaver?.mode ?? 'clock',
    cursorHideSeconds: settings?.cursorHideSeconds ?? 3,
    transitionEffect: settings?.transitionEffect ?? 'fade',
    transitionDuration: settings?.transitionDuration ?? 0.6,
  };
}

/* ─── Page ────────────────────────────────────────── */

function getInitialTab(): TabId {
  if (typeof window === 'undefined') return 'display';
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab') as TabId;
  return TABS.some((t) => t.id === tab) ? tab : 'display';
}

export default function SettingsPage() {
  const router = useRouter();
  const initialTab = getInitialTab();

  const { config, updateSettings, saveConfig, loadConfig } = useEditorStore();
  const settings = config?.settings;

  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [state, setState] = useState<SettingsState>(() => initSettings(settings));
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Load config on mount (handles hard refresh / direct URL visit)
  useEffect(() => {
    if (!config) loadConfig();
  }, [config, loadConfig]);

  // Re-initialize local state once config arrives (initial load only).
  // Imports re-sync via DataSection's onSettingsImported callback.
  // Profile actions that mutate config.settings (e.g. setActiveProfile) must NOT wipe unsaved form edits.
  const settingsInitRef = useRef(false);
  useEffect(() => {
    if (settings && !settingsInitRef.current) {
      settingsInitRef.current = true;
      setState(initSettings(settings));
    }
  }, [settings]);

  // Upgrade/rollback modal state
  const [upgradeTarget, setUpgradeTarget] = useState<string | null>(null);
  const [rollbackTarget, setRollbackTarget] = useState<string | null>(null);

  const update = useCallback((updates: Partial<SettingsState>) => {
    setState((prev) => ({ ...prev, ...updates }));
    setSaveMessage(null);
  }, []);

  function handleTabChange(tab: TabId) {
    setActiveTab(tab);
    // Update URL without full navigation
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState(null, '', url.toString());
  }

  async function handleSave() {
    setSaving(true);
    setSaveMessage(null);
    try {
      const parsedLat = parseFloat(state.lat) || 0;
      const parsedLon = parseFloat(state.lon) || 0;
      updateSettings({
        rotationIntervalMs: state.rotationInterval * 1000,
        displayWidth: state.displayWidth,
        displayHeight: state.displayHeight,
        displayTransform: state.displayTransform as 'normal' | '90' | '180' | '270',
        latitude: parsedLat,
        longitude: parsedLon,
        locationName: state.locationName ?? undefined,
        timezone: state.timezone || undefined,
        weather: {
          provider: state.provider as 'openweathermap' | 'weatherapi',
          latitude: parsedLat,
          longitude: parsedLon,
          units: state.units as 'metric' | 'imperial',
        },
        calendar: {
          googleCalendarId: state.selectedCalendarIds[0] ?? '',
          googleCalendarIds: state.selectedCalendarIds,
          icalSources: state.icalSources,
          maxEvents: state.maxEvents,
          daysAhead: state.daysAhead,
        },
        sleep: {
          enabled: state.sleepEnabled,
          dimAfterMinutes: state.dimAfterMinutes,
          sleepAfterMinutes: state.sleepAfterMinutes,
          dimBrightness: state.dimBrightness,
          ...(state.dimScheduleEnabled ? { dimSchedule: { startTime: state.dimStartTime, endTime: state.dimEndTime } } : {}),
          ...(state.sleepScheduleEnabled ? { schedule: { startTime: state.sleepStartTime, endTime: state.sleepEndTime } } : {}),
        },
        screensaver: {
          mode: state.screensaverMode as 'clock' | 'blank' | 'off',
        },
        cursorHideSeconds: state.cursorHideSeconds,
        transitionEffect: state.transitionEffect as GlobalSettings['transitionEffect'],
        transitionDuration: state.transitionDuration,
      });
      await saveConfig();
      setSaveMessage('Saved');
      setTimeout(() => setSaveMessage(null), 2000);
    } finally {
      setSaving(false);
    }
  }

  function handleUpgradeComplete() {
    setUpgradeTarget(null);
    setRollbackTarget(null);
    setTimeout(() => window.location.reload(), 2000);
  }

  function handleBack() {
    // Reload config in case it was modified by system restore
    loadConfig();
    router.push('/editor');
  }

  const activeTarget = upgradeTarget || rollbackTarget;

  if (activeTarget) {
    return (
      <UpgradeModal
        targetTag={activeTarget}
        isRollback={!!rollbackTarget}
        onComplete={handleUpgradeComplete}
        onClose={() => { setUpgradeTarget(null); setRollbackTarget(null); }}
      />
    );
  }

  if (!settings) {
    return (
      <div className="h-screen flex items-center justify-center text-neutral-500">
        Loading...
      </div>
    );
  }

  const SELF_SAVING_TABS = new Set<TabId>(['system', 'data', 'integrations', 'security', 'profiles', 'stats']);
  const showSaveButton = !SELF_SAVING_TABS.has(activeTab);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-700 bg-neutral-900 px-4 py-2.5">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Editor
          </button>
          <div className="h-6 w-px bg-neutral-800" />
          <button onClick={handleBack}>
            <HomeScreensLogo contextLabel="Settings" />
          </button>
        </div>
        {showSaveButton && (
          <div className="flex items-center gap-3">
            {saveMessage && (
              <span className="text-xs text-green-400">{saveMessage}</span>
            )}
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav className="w-52 shrink-0 border-r border-neutral-700 bg-neutral-900/50 py-3 overflow-y-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-neutral-800 text-neutral-100 border-r-2 border-blue-500'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-6">
            {activeTab === 'display' && (
              <DisplaySection
                values={{
                  displayWidth: state.displayWidth,
                  displayHeight: state.displayHeight,
                  displayTransform: state.displayTransform,
                  rotationInterval: state.rotationInterval,
                  cursorHideSeconds: state.cursorHideSeconds,
                  transitionEffect: state.transitionEffect,
                  transitionDuration: state.transitionDuration,
                }}
                onChange={update}
              />
            )}

            {activeTab === 'profiles' && (
              <ProfilesSection />
            )}

            {activeTab === 'sleep' && (
              <SleepSection
                values={{
                  sleepEnabled: state.sleepEnabled,
                  dimAfterMinutes: state.dimAfterMinutes,
                  sleepAfterMinutes: state.sleepAfterMinutes,
                  dimBrightness: state.dimBrightness,
                  dimScheduleEnabled: state.dimScheduleEnabled,
                  dimStartTime: state.dimStartTime,
                  dimEndTime: state.dimEndTime,
                  sleepScheduleEnabled: state.sleepScheduleEnabled,
                  sleepStartTime: state.sleepStartTime,
                  sleepEndTime: state.sleepEndTime,
                  screensaverMode: state.screensaverMode,
                }}
                onChange={update}
              />
            )}

            {activeTab === 'location' && (
              <LocationSection
                values={{
                  lat: state.lat,
                  lon: state.lon,
                  locationName: state.locationName,
                  timezone: state.timezone,
                }}
                onChange={update}
              />
            )}

            {activeTab === 'weather' && (
              <WeatherSection
                values={{
                  provider: state.provider,
                  units: state.units,
                  lat: state.lat,
                  lon: state.lon,
                }}
                onChange={update}
              />
            )}

            {activeTab === 'calendar' && (
              <CalendarSection
                values={{
                  selectedCalendarIds: state.selectedCalendarIds,
                  icalSources: state.icalSources,
                  maxEvents: state.maxEvents,
                  daysAhead: state.daysAhead,
                }}
                onChange={update}
              />
            )}

            {activeTab === 'integrations' && (
              <IntegrationsSection />
            )}

            {activeTab === 'security' && (
              <SecuritySection />
            )}

            {activeTab === 'data' && (
              <DataSection
                onSettingsImported={() => {
                  const imported = useEditorStore.getState().config?.settings;
                  setState(initSettings(imported));
                }}
              />
            )}

            {activeTab === 'stats' && (
              <StatsSection />
            )}

            {activeTab === 'system' && (
              <SystemSection
                onUpgrade={(tag) => setUpgradeTarget(tag)}
                onRollback={(tag) => setRollbackTarget(tag)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
