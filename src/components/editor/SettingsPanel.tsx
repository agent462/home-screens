'use client';

import { useState } from 'react';
import { useEditorStore } from '@/stores/editor-store';
import type { GlobalSettings } from '@/types/config';
import Button from '@/components/ui/Button';
import DisplaySection from './settings/DisplaySection';
import SleepSection from './settings/SleepSection';
import LocationSection from './settings/LocationSection';
import WeatherSection from './settings/WeatherSection';
import UnsplashSection from './settings/UnsplashSection';
import CalendarSection from './settings/CalendarSection';

interface SettingsState {
  weatherApiKey: string;
  provider: string;
  lat: string;
  lon: string;
  units: string;
  locationName: string | null;
  unsplashKey: string;
  selectedCalendarIds: string[];
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
}

function initSettings(settings: GlobalSettings | undefined): SettingsState {
  return {
    weatherApiKey: settings?.weather.apiKey ?? '',
    provider: settings?.weather.provider ?? 'weatherapi',
    lat: (settings?.latitude ?? settings?.weather.latitude)?.toString() ?? '',
    lon: (settings?.longitude ?? settings?.weather.longitude)?.toString() ?? '',
    units: settings?.weather.units ?? 'imperial',
    locationName: settings?.locationName ?? null,
    unsplashKey: settings?.unsplashAccessKey ?? '',
    selectedCalendarIds:
      settings?.calendar.googleCalendarIds ??
      (settings?.calendar.googleCalendarId ? [settings.calendar.googleCalendarId] : []),
    maxEvents: settings?.calendar.maxEvents ?? 10,
    daysAhead: settings?.calendar.daysAhead ?? 7,
    rotationInterval: (settings?.rotationIntervalMs ?? 30000) / 1000,
    displayWidth: settings?.displayWidth ?? 1080,
    displayHeight: settings?.displayHeight ?? 1920,
    displayTransform: settings?.displayTransform ?? 'normal',
    timezone: settings?.timezone ?? '',
    sleepEnabled: settings?.sleep?.enabled ?? false,
    dimAfterMinutes: settings?.sleep?.dimAfterMinutes ?? 10,
    sleepAfterMinutes: settings?.sleep?.sleepAfterMinutes ?? 30,
    dimBrightness: settings?.sleep?.dimBrightness ?? 20,
    dimScheduleEnabled: !!settings?.sleep?.dimSchedule,
    dimStartTime: settings?.sleep?.dimSchedule?.startTime ?? '23:00',
    dimEndTime: settings?.sleep?.dimSchedule?.endTime ?? '06:00',
    sleepScheduleEnabled: !!settings?.sleep?.schedule,
    sleepStartTime: settings?.sleep?.schedule?.startTime ?? '23:00',
    sleepEndTime: settings?.sleep?.schedule?.endTime ?? '06:00',
    screensaverMode: settings?.screensaver?.mode ?? 'clock',
  };
}

export default function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { config, updateSettings, saveConfig } = useEditorStore();
  const settings = config?.settings;

  const [state, setState] = useState<SettingsState>(() => initSettings(settings));

  function update(updates: Partial<SettingsState>) {
    setState((prev) => ({ ...prev, ...updates }));
  }

  if (!settings) return null;

  async function handleSave() {
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
      unsplashAccessKey: state.unsplashKey,
      weather: {
        provider: state.provider as 'openweathermap' | 'weatherapi',
        apiKey: state.weatherApiKey,
        latitude: parsedLat,
        longitude: parsedLon,
        units: state.units as 'metric' | 'imperial',
      },
      calendar: {
        googleCalendarId: state.selectedCalendarIds[0] ?? '',
        googleCalendarIds: state.selectedCalendarIds,
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
    });
    await saveConfig();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-700">
          <h2 className="text-lg font-semibold text-neutral-100">Settings</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="px-5 py-4 space-y-0 divide-y divide-neutral-600 [&>section]:py-5 [&>section:first-child]:pt-0 [&>section:last-child]:pb-0">
          <DisplaySection
            values={{
              displayWidth: state.displayWidth,
              displayHeight: state.displayHeight,
              displayTransform: state.displayTransform,
              rotationInterval: state.rotationInterval,
            }}
            onChange={update}
          />

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

          <LocationSection
            values={{
              lat: state.lat,
              lon: state.lon,
              locationName: state.locationName,
              timezone: state.timezone,
            }}
            onChange={update}
          />

          <WeatherSection
            values={{
              weatherApiKey: state.weatherApiKey,
              provider: state.provider,
              units: state.units,
              lat: state.lat,
              lon: state.lon,
            }}
            onChange={update}
          />

          <UnsplashSection
            values={{ unsplashKey: state.unsplashKey }}
            onChange={update}
          />

          <CalendarSection
            values={{
              selectedCalendarIds: state.selectedCalendarIds,
              maxEvents: state.maxEvents,
              daysAhead: state.daysAhead,
            }}
            onChange={update}
          />
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-neutral-700">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
