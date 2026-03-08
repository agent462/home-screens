'use client';

import { useState, useEffect, useCallback } from 'react';
import { useEditorStore } from '@/stores/editor-store';
import Button from '@/components/ui/Button';
import Slider from '@/components/ui/Slider';
import { DISPLAY_PRESETS, DISPLAY_TRANSFORMS } from '@/lib/constants';

interface GoogleCalendar {
  id: string;
  summary: string;
  backgroundColor: string;
  primary: boolean;
}

export default function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { config, updateSettings, saveConfig } = useEditorStore();
  const settings = config?.settings;

  const [weatherApiKey, setWeatherApiKey] = useState(settings?.weather.apiKey ?? '');
  const [provider, setProvider] = useState<string>(settings?.weather.provider ?? 'weatherapi');
  const [lat, setLat] = useState(settings?.weather.latitude?.toString() ?? '');
  const [lon, setLon] = useState(settings?.weather.longitude?.toString() ?? '');
  const [units, setUnits] = useState<string>(settings?.weather.units ?? 'imperial');
  const [locationQuery, setLocationQuery] = useState('');
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [unsplashKey, setUnsplashKey] = useState(settings?.unsplashAccessKey ?? '');
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>(
    settings?.calendar.googleCalendarIds ??
    (settings?.calendar.googleCalendarId ? [settings.calendar.googleCalendarId] : [])
  );
  const [maxEvents, setMaxEvents] = useState(settings?.calendar.maxEvents ?? 10);
  const [daysAhead, setDaysAhead] = useState(settings?.calendar.daysAhead ?? 7);
  const [rotationInterval, setRotationInterval] = useState(
    (settings?.rotationIntervalMs ?? 30000) / 1000
  );
  const [displayWidth, setDisplayWidth] = useState(settings?.displayWidth ?? 1080);
  const [displayHeight, setDisplayHeight] = useState(settings?.displayHeight ?? 1920);
  const [displayTransform, setDisplayTransform] = useState(settings?.displayTransform ?? 'normal');

  const [testStatus, setTestStatus] = useState<string | null>(null);

  // Google auth state
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleCalendars, setGoogleCalendars] = useState<GoogleCalendar[]>([]);
  const [googleLoading, setGoogleLoading] = useState(true);

  // Device flow state
  const [deviceCode, setDeviceCode] = useState<string | null>(null);
  const [userCode, setUserCode] = useState<string | null>(null);
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);
  const [deviceFlowError, setDeviceFlowError] = useState<string | null>(null);
  const [deviceFlowPolling, setDeviceFlowPolling] = useState(false);

  const fetchCalendars = useCallback(async () => {
    try {
      const res = await fetch('/api/calendars');
      if (res.ok) {
        const cals: GoogleCalendar[] = await res.json();
        setGoogleCalendars(cals);
        // Auto-select primary calendar if nothing is selected yet
        if (selectedCalendarIds.length === 0 && cals.length > 0) {
          const primary = cals.find((c) => c.primary);
          if (primary) setSelectedCalendarIds([primary.id]);
        }
      }
    } catch {
      // ignore
    }
  }, [selectedCalendarIds.length]);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/google/status');
        const data = await res.json();
        setGoogleConnected(data.connected);
        if (data.connected) await fetchCalendars();
      } catch {
        // ignore
      } finally {
        setGoogleLoading(false);
      }
    }
    checkAuth();
  }, [fetchCalendars]);

  function toggleCalendar(id: string) {
    setSelectedCalendarIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  async function disconnectGoogle() {
    await fetch('/api/auth/google/status', { method: 'DELETE' });
    setGoogleConnected(false);
    setGoogleCalendars([]);
    setSelectedCalendarIds([]);
  }

  async function startDeviceFlow() {
    setDeviceFlowError(null);
    setUserCode(null);
    try {
      const res = await fetch('/api/auth/google/device', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start device flow');
      setDeviceCode(data.device_code);
      setUserCode(data.user_code);
      setVerificationUrl(data.verification_url);
      setDeviceFlowPolling(true);
      pollForToken(data.device_code, data.interval || 5, data.expires_in || 1800);
    } catch (err) {
      setDeviceFlowError(err instanceof Error ? err.message : 'Failed to start sign-in');
    }
  }

  async function pollForToken(code: string, interval: number, expiresIn: number) {
    const deadline = Date.now() + expiresIn * 1000;
    const pollInterval = Math.max(interval, 5) * 1000; // respect Google's minimum

    const poll = async () => {
      if (Date.now() > deadline) {
        setDeviceFlowPolling(false);
        setDeviceFlowError('Code expired. Please try again.');
        setUserCode(null);
        return;
      }
      try {
        const res = await fetch('/api/auth/google/device', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ device_code: code }),
        });
        const data = await res.json();
        if (data.status === 'success') {
          setDeviceFlowPolling(false);
          setUserCode(null);
          setDeviceCode(null);
          setGoogleConnected(true);
          await fetchCalendars();
          return;
        }
        if (data.status === 'pending') {
          setTimeout(poll, pollInterval);
          return;
        }
        // expired or denied
        setDeviceFlowPolling(false);
        setDeviceFlowError(data.error || 'Authorization failed');
        setUserCode(null);
      } catch {
        setTimeout(poll, pollInterval);
      }
    };

    setTimeout(poll, pollInterval);
  }

  async function lookupLocation() {
    if (!locationQuery.trim()) return;
    setLocationStatus('Looking up...');
    setLocationName(null);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(locationQuery.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setLat(data.latitude.toFixed(4));
        setLon(data.longitude.toFixed(4));
        setLocationName(data.displayName);
        setLocationStatus(`Found: ${data.displayName}`);
      } else {
        const err = await res.json();
        setLocationStatus(`Error: ${err.error}`);
      }
    } catch {
      setLocationStatus('Failed to look up location');
    }
  }

  function detectLocation() {
    if (!navigator.geolocation) {
      setLocationStatus('Error: Geolocation not supported in this browser');
      return;
    }
    setLocationStatus('Detecting...');
    setLocationName(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const newLat = pos.coords.latitude.toFixed(4);
        const newLon = pos.coords.longitude.toFixed(4);
        setLat(newLat);
        setLon(newLon);
        // Reverse geocode for display name
        try {
          const res = await fetch(`/api/geocode?q=${newLat},${newLon}`);
          if (res.ok) {
            const data = await res.json();
            setLocationName(data.displayName);
            setLocationStatus(`Detected: ${data.displayName}`);
          } else {
            setLocationStatus(`Detected: ${newLat}, ${newLon}`);
          }
        } catch {
          setLocationStatus(`Detected: ${newLat}, ${newLon}`);
        }
      },
      (err) => {
        setLocationStatus(`Error: ${err.message}`);
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }

  if (!settings) return null;

  async function handleSave() {
    updateSettings({
      rotationIntervalMs: rotationInterval * 1000,
      displayWidth,
      displayHeight,
      displayTransform: displayTransform as 'normal' | '90' | '180' | '270',
      unsplashAccessKey: unsplashKey,
      weather: {
        provider: provider as 'openweathermap' | 'weatherapi',
        apiKey: weatherApiKey,
        latitude: parseFloat(lat) || 0,
        longitude: parseFloat(lon) || 0,
        units: units as 'metric' | 'imperial',
      },
      calendar: {
        googleCalendarId: selectedCalendarIds[0] ?? '',
        googleCalendarIds: selectedCalendarIds,
        maxEvents,
        daysAhead,
      },
    });
    await saveConfig();
    onClose();
  }

  async function testWeather() {
    setTestStatus('Testing...');
    try {
      // Save current settings first so the API can read them
      updateSettings({
        weather: {
          provider: provider as 'openweathermap' | 'weatherapi',
          apiKey: weatherApiKey,
          latitude: parseFloat(lat) || 0,
          longitude: parseFloat(lon) || 0,
          units: units as 'metric' | 'imperial',
        },
      });
      await saveConfig();

      const res = await fetch(
        `/api/weather?provider=${provider}&lat=${lat}&lon=${lon}&units=${units}&type=hourly`
      );
      if (res.ok) {
        const data = await res.json();
        const hourly = data.hourly ?? data;
        if (Array.isArray(hourly) && hourly.length > 0) {
          setTestStatus(`Working! Current temp: ${Math.round(hourly[0].temp)}°`);
        } else {
          setTestStatus('Connected but no data returned');
        }
      } else {
        const err = await res.json();
        setTestStatus(`Error: ${err.error}`);
      }
    } catch (e) {
      setTestStatus(`Failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
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
          {/* Display Settings */}
          <section>
            <h3 className="text-sm font-medium text-neutral-300 mb-3 uppercase tracking-wider">
              Display
            </h3>
            <label className="block mb-3">
              <span className="text-xs text-neutral-400">Display Resolution</span>
              <select
                value={`${displayWidth}x${displayHeight}`}
                onChange={(e) => {
                  if (e.target.value === 'custom') return;
                  const [w, h] = e.target.value.split('x').map(Number);
                  setDisplayWidth(w);
                  setDisplayHeight(h);
                }}
                className="mt-1 block w-full rounded-md bg-neutral-800 border border-neutral-600 text-sm text-neutral-200 px-3 py-2 focus:outline-none focus:border-blue-500"
              >
                {DISPLAY_PRESETS.map((p) => (
                  <option key={`${p.width}x${p.height}`} value={`${p.width}x${p.height}`}>
                    {p.label}
                  </option>
                ))}
                {!DISPLAY_PRESETS.some((p) => p.width === displayWidth && p.height === displayHeight) && (
                  <option value={`${displayWidth}x${displayHeight}`}>
                    Custom ({displayWidth} x {displayHeight})
                  </option>
                )}
              </select>
              <p className="text-xs text-neutral-500 mt-1">
                Match this to your physical display. Changing resolution affects the module canvas size.
              </p>
            </label>
            <label className="block mb-3">
              <span className="text-xs text-neutral-400">Display Orientation</span>
              <select
                value={displayTransform}
                onChange={(e) => setDisplayTransform(e.target.value as 'normal' | '90' | '180' | '270')}
                className="mt-1 block w-full rounded-md bg-neutral-800 border border-neutral-600 text-sm text-neutral-200 px-3 py-2 focus:outline-none focus:border-blue-500"
              >
                {DISPLAY_TRANSFORMS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <p className="text-xs text-neutral-500 mt-1">
                Physical rotation applied via wlr-randr on the kiosk. Takes effect on next boot.
              </p>
            </label>
            <Slider
              label="Screen Rotation (seconds)"
              value={rotationInterval}
              min={5}
              max={120}
              step={5}
              onChange={setRotationInterval}
            />
          </section>

          {/* Weather Settings */}
          <section>
            <h3 className="text-sm font-medium text-neutral-300 mb-3 uppercase tracking-wider">
              Weather
            </h3>
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs text-neutral-400">Provider</span>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="mt-1 block w-full rounded-md bg-neutral-800 border border-neutral-600 text-sm text-neutral-200 px-3 py-2 focus:outline-none focus:border-blue-500"
                >
                  <option value="weatherapi">WeatherAPI.com (free, no credit card)</option>
                  <option value="openweathermap">OpenWeatherMap (One Call 3.0)</option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs text-neutral-400">
                  API Key
                  {provider === 'weatherapi' && (
                    <span className="text-neutral-500 ml-1">
                      — get one free at weatherapi.com
                    </span>
                  )}
                  {provider === 'openweathermap' && (
                    <span className="text-neutral-500 ml-1">
                      — requires One Call 3.0 subscription
                    </span>
                  )}
                </span>
                <input
                  type="password"
                  value={weatherApiKey}
                  onChange={(e) => setWeatherApiKey(e.target.value)}
                  placeholder="Paste your API key here"
                  className="mt-1 block w-full rounded-md bg-neutral-800 border border-neutral-600 text-sm text-neutral-200 px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </label>

              {/* Location picker */}
              <div className="space-y-2">
                <span className="text-xs text-neutral-400">Location</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && lookupLocation()}
                    placeholder="Zip code or city name"
                    className="flex-1 rounded-md bg-neutral-800 border border-neutral-600 text-sm text-neutral-200 px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                  <Button variant="secondary" size="sm" onClick={lookupLocation}>
                    Look up
                  </Button>
                  <Button variant="secondary" size="sm" onClick={detectLocation}>
                    Detect
                  </Button>
                </div>
                {locationStatus && (
                  <p className={`text-xs ${locationStatus.startsWith('Error') || locationStatus.startsWith('Failed') ? 'text-red-400' : 'text-green-400'}`}>
                    {locationStatus}
                  </p>
                )}
                {(lat && lon) && (
                  <p className="text-xs text-neutral-500">
                    {locationName ? `${locationName} — ` : ''}
                    {lat}, {lon}
                  </p>
                )}
              </div>

              {/* Advanced: raw lat/lon toggle */}
              <details className="text-xs">
                <summary className="text-neutral-500 cursor-pointer hover:text-neutral-400">
                  Edit coordinates manually
                </summary>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <label className="block">
                    <span className="text-xs text-neutral-400">Latitude</span>
                    <input
                      type="text"
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      placeholder="40.7128"
                      className="mt-1 block w-full rounded-md bg-neutral-800 border border-neutral-600 text-sm text-neutral-200 px-3 py-2 focus:outline-none focus:border-blue-500"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-neutral-400">Longitude</span>
                    <input
                      type="text"
                      value={lon}
                      onChange={(e) => setLon(e.target.value)}
                      placeholder="-74.006"
                      className="mt-1 block w-full rounded-md bg-neutral-800 border border-neutral-600 text-sm text-neutral-200 px-3 py-2 focus:outline-none focus:border-blue-500"
                    />
                  </label>
                </div>
              </details>

              <label className="block">
                <span className="text-xs text-neutral-400">Units</span>
                <select
                  value={units}
                  onChange={(e) => setUnits(e.target.value)}
                  className="mt-1 block w-full rounded-md bg-neutral-800 border border-neutral-600 text-sm text-neutral-200 px-3 py-2 focus:outline-none focus:border-blue-500"
                >
                  <option value="imperial">Imperial (°F, mph)</option>
                  <option value="metric">Metric (°C, km/h)</option>
                </select>
              </label>

              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={testWeather}>
                  Test Weather Connection
                </Button>
                {testStatus && (
                  <span className={`text-xs ${testStatus.startsWith('Working') ? 'text-green-400' : testStatus.startsWith('Error') || testStatus.startsWith('Failed') ? 'text-red-400' : 'text-neutral-400'}`}>
                    {testStatus}
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* Unsplash Settings */}
          <section>
            <h3 className="text-sm font-medium text-neutral-300 mb-3 uppercase tracking-wider">
              Backgrounds (Unsplash)
            </h3>
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs text-neutral-400">
                  Access Key
                  <span className="text-neutral-500 ml-1">
                    — free at unsplash.com/developers
                  </span>
                </span>
                <input
                  type="password"
                  value={unsplashKey}
                  onChange={(e) => setUnsplashKey(e.target.value)}
                  placeholder="Paste your Unsplash access key"
                  className="mt-1 block w-full rounded-md bg-neutral-800 border border-neutral-600 text-sm text-neutral-200 px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </label>
              <p className="text-xs text-neutral-500">
                Enables browsing thousands of free HD photos by category in the background picker.
                50 requests/hour on the free tier.
              </p>
            </div>
          </section>

          {/* Google Calendar Settings */}
          <section>
            <h3 className="text-sm font-medium text-neutral-300 mb-3 uppercase tracking-wider">
              Google Calendar
            </h3>
            <div className="space-y-3">
              {googleLoading ? (
                <p className="text-xs text-neutral-500">Checking connection...</p>
              ) : googleConnected ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-green-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                      Connected to Google
                    </span>
                    <button
                      onClick={disconnectGoogle}
                      className="text-xs text-neutral-500 hover:text-red-400 transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>

                  {googleCalendars.length > 0 ? (
                    <div className="space-y-1">
                      <span className="text-xs text-neutral-400">Select calendars to display</span>
                      <div className="max-h-40 overflow-y-auto rounded-md bg-neutral-800 border border-neutral-600 divide-y divide-neutral-700">
                        {googleCalendars.map((cal) => (
                          <label
                            key={cal.id}
                            className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-neutral-750"
                          >
                            <input
                              type="checkbox"
                              checked={selectedCalendarIds.includes(cal.id)}
                              onChange={() => toggleCalendar(cal.id)}
                              className="rounded border-neutral-600 bg-neutral-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                            />
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: cal.backgroundColor }}
                            />
                            <span className="text-sm text-neutral-200 truncate">
                              {cal.summary}
                              {cal.primary && (
                                <span className="text-neutral-500 ml-1 text-xs">(primary)</span>
                              )}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-500">No calendars found.</p>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  {userCode && verificationUrl ? (
                    <div className="space-y-3">
                      <p className="text-xs text-neutral-400">
                        Open the link below on your phone or computer, then enter the code:
                      </p>
                      <div className="flex items-center gap-3">
                        <a
                          href={verificationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-400 hover:text-blue-300 underline"
                        >
                          {verificationUrl}
                        </a>
                      </div>
                      <div className="flex items-center gap-3">
                        <code className="text-2xl font-bold tracking-widest text-neutral-100 bg-neutral-800 border border-neutral-600 rounded-lg px-4 py-2">
                          {userCode}
                        </code>
                        {deviceFlowPolling && (
                          <span className="text-xs text-neutral-500 animate-pulse">
                            Waiting for authorization...
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={startDeviceFlow}
                      disabled={deviceFlowPolling}
                    >
                      Sign in with Google
                    </Button>
                  )}
                  {deviceFlowError && (
                    <p className="text-xs text-red-400">{deviceFlowError}</p>
                  )}
                  <p className="text-xs text-neutral-500">
                    Sign in to automatically see your calendars. Requires a Google OAuth client
                    of type &quot;TVs and Limited Input devices&quot; in the Cloud Console.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Slider
                    label="Max Events"
                    value={maxEvents}
                    min={1}
                    max={20}
                    onChange={setMaxEvents}
                  />
                </div>
                <div>
                  <Slider
                    label="Days Ahead"
                    value={daysAhead}
                    min={1}
                    max={30}
                    onChange={setDaysAhead}
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
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
