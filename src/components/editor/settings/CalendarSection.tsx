'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { editorFetch } from '@/lib/editor-fetch';
import type { ICalSource } from '@/types/config';
import Slider from '@/components/ui/Slider';
import Button from '@/components/ui/Button';

interface GoogleCalendar {
  id: string;
  summary: string;
  backgroundColor: string;
  primary: boolean;
}

interface CalendarSettings {
  selectedCalendarIds: string[];
  icalSources: ICalSource[];
  maxEvents: number;
  daysAhead: number;
}

interface Props {
  values: CalendarSettings;
  onChange: (updates: Partial<CalendarSettings>) => void;
}

const ICAL_COLOR_PALETTE = [
  '#f97316', '#a855f7', '#3b82f6', '#ef4444',
  '#10b981', '#f59e0b', '#ec4899', '#06b6d4',
];

export default function CalendarSection({ values, onChange }: Props) {
  const { selectedCalendarIds, icalSources, maxEvents, daysAhead } = values;

  const [credentialsConfigured, setCredentialsConfigured] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleCalendars, setGoogleCalendars] = useState<GoogleCalendar[]>([]);
  const [googleLoading, setGoogleLoading] = useState(true);

  const [, setDeviceCode] = useState<string | null>(null);
  const [userCode, setUserCode] = useState<string | null>(null);
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);
  const [deviceFlowError, setDeviceFlowError] = useState<string | null>(null);
  const [deviceFlowPolling, setDeviceFlowPolling] = useState(false);
  const pollingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  // ICS feed form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFeedName, setNewFeedName] = useState('');
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [newFeedColor, setNewFeedColor] = useState(() => {
    const usedColors = new Set(icalSources.map(s => s.color));
    return ICAL_COLOR_PALETTE.find(c => !usedColors.has(c)) ?? ICAL_COLOR_PALETTE[0];
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      if (pollingTimerRef.current) clearTimeout(pollingTimerRef.current);
    };
  }, []);

  const fetchCalendars = useCallback(async () => {
    try {
      const res = await editorFetch('/api/calendars');
      if (res.ok) {
        const cals: GoogleCalendar[] = await res.json();
        setGoogleCalendars(cals);
        // Only auto-select primary Google calendar on first connection,
        // not when an ICS-only user has no Google calendars selected
        if (selectedCalendarIds.length === 0 && icalSources.length === 0 && cals.length > 0) {
          const primary = cals.find((c) => c.primary);
          if (primary) onChange({ selectedCalendarIds: [primary.id] });
        }
      }
    } catch {
      // ignore
    }
  }, [selectedCalendarIds.length, icalSources.length, onChange]);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await editorFetch('/api/auth/google/status');
        const data = await res.json();
        setCredentialsConfigured(!!data.credentialsConfigured);
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
    const next = selectedCalendarIds.includes(id)
      ? selectedCalendarIds.filter((c) => c !== id)
      : [...selectedCalendarIds, id];
    onChange({ selectedCalendarIds: next });
  }

  async function disconnectGoogle() {
    await editorFetch('/api/auth/google/status', { method: 'DELETE' });
    setGoogleConnected(false);
    setGoogleCalendars([]);
    onChange({ selectedCalendarIds: [] });
  }

  async function startDeviceFlow() {
    setDeviceFlowError(null);
    setUserCode(null);
    try {
      const res = await editorFetch('/api/auth/google/device', { method: 'POST' });
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

  function pollForToken(code: string, interval: number, expiresIn: number) {
    const deadline = Date.now() + expiresIn * 1000;
    const pollInterval = Math.max(interval, 5) * 1000;
    cancelledRef.current = false;

    const scheduleNext = (fn: () => void) => {
      pollingTimerRef.current = setTimeout(fn, pollInterval);
    };

    const poll = async () => {
      if (cancelledRef.current) return;
      if (Date.now() > deadline) {
        setDeviceFlowPolling(false);
        setDeviceFlowError('Code expired. Please try again.');
        setUserCode(null);
        return;
      }
      try {
        const res = await editorFetch('/api/auth/google/device', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ device_code: code }),
        });
        if (cancelledRef.current) return;
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
          scheduleNext(poll);
          return;
        }
        setDeviceFlowPolling(false);
        setDeviceFlowError(data.error || 'Authorization failed');
        setUserCode(null);
      } catch {
        if (!cancelledRef.current) scheduleNext(poll);
      }
    };

    scheduleNext(poll);
  }

  // ICS source handlers
  function addICalSource() {
    if (!newFeedName.trim() || !newFeedUrl.trim()) return;
    const newSource: ICalSource = {
      id: crypto.randomUUID(),
      type: 'ical',
      name: newFeedName.trim(),
      url: newFeedUrl.trim(),
      color: newFeedColor,
      enabled: true,
    };
    onChange({ icalSources: [...icalSources, newSource] });
    setNewFeedName('');
    setNewFeedUrl('');
    setShowAddForm(false);
    // Auto-pick next unused color
    const usedColors = new Set([...icalSources.map(s => s.color), newFeedColor]);
    setNewFeedColor(ICAL_COLOR_PALETTE.find(c => !usedColors.has(c)) ?? ICAL_COLOR_PALETTE[0]);
  }

  function removeICalSource(id: string) {
    onChange({ icalSources: icalSources.filter(s => s.id !== id) });
    if (editingId === id) setEditingId(null);
  }

  function toggleICalSource(id: string) {
    onChange({
      icalSources: icalSources.map(s =>
        s.id === id ? { ...s, enabled: !s.enabled } : s
      ),
    });
  }

  function updateICalSource(id: string, updates: Partial<ICalSource>) {
    onChange({
      icalSources: icalSources.map(s =>
        s.id === id ? { ...s, ...updates } : s
      ),
    });
  }

  return (
    <div className="space-y-6">
      {/* Google Calendar section */}
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
          ) : !credentialsConfigured ? (
            <div className="space-y-2">
              <p className="text-xs text-neutral-400">
                Google OAuth credentials are required to connect your calendar.
              </p>
              <p className="text-xs text-neutral-500">
                Set up your Client ID and Client Secret in{' '}
                <a
                  href="/editor/settings?tab=integrations"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  Settings &rarr; Integrations
                </a>
                {' '}first.
              </p>
            </div>
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
        </div>
      </section>

      {/* ICS / iCal Feeds section */}
      <section>
        <h3 className="text-sm font-medium text-neutral-300 mb-3 uppercase tracking-wider">
          iCal / ICS Feeds
        </h3>
        <div className="space-y-3">
          {icalSources.length > 0 && (
            <div className="rounded-md bg-neutral-800 border border-neutral-600 divide-y divide-neutral-700">
              {icalSources.map((source) => (
                <div key={source.id}>
                  <div className="flex items-center gap-3 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={source.enabled}
                      onChange={() => toggleICalSource(source.id)}
                      className="rounded border-neutral-600 bg-neutral-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: source.color }}
                    />
                    <span className="text-sm text-neutral-200 truncate flex-1">
                      {source.name}
                    </span>
                    <button
                      onClick={() => setEditingId(editingId === source.id ? null : source.id)}
                      className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                    >
                      {editingId === source.id ? 'done' : 'edit'}
                    </button>
                    <button
                      onClick={() => removeICalSource(source.id)}
                      className="text-xs text-neutral-500 hover:text-red-400 transition-colors"
                    >
                      &times;
                    </button>
                  </div>
                  {editingId === source.id && (
                    <div className="px-3 pb-3 space-y-2">
                      <input
                        type="text"
                        value={source.name}
                        onChange={(e) => updateICalSource(source.id, { name: e.target.value })}
                        className="w-full rounded-md bg-neutral-900 border border-neutral-600 px-2.5 py-1.5 text-sm text-neutral-200 focus:border-blue-500 focus:outline-none"
                        placeholder="Feed name"
                      />
                      <input
                        type="text"
                        value={source.url}
                        onChange={(e) => updateICalSource(source.id, { url: e.target.value })}
                        className="w-full rounded-md bg-neutral-900 border border-neutral-600 px-2.5 py-1.5 text-sm text-neutral-200 focus:border-blue-500 focus:outline-none font-mono text-xs"
                        placeholder="https://example.com/calendar.ics"
                      />
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-neutral-400 mr-1">Color</span>
                        {ICAL_COLOR_PALETTE.map((color) => (
                          <button
                            key={color}
                            onClick={() => updateICalSource(source.id, { color })}
                            className="w-5 h-5 rounded-full border-2 transition-colors"
                            style={{
                              backgroundColor: color,
                              borderColor: source.color === color ? '#fff' : 'transparent',
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {showAddForm ? (
            <div className="rounded-md bg-neutral-800 border border-neutral-600 p-3 space-y-2">
              <input
                type="text"
                value={newFeedName}
                onChange={(e) => setNewFeedName(e.target.value)}
                className="w-full rounded-md bg-neutral-900 border border-neutral-600 px-2.5 py-1.5 text-sm text-neutral-200 focus:border-blue-500 focus:outline-none"
                placeholder="Feed name (e.g. Work, Sports)"
                autoFocus
              />
              <input
                type="text"
                value={newFeedUrl}
                onChange={(e) => setNewFeedUrl(e.target.value)}
                className="w-full rounded-md bg-neutral-900 border border-neutral-600 px-2.5 py-1.5 text-sm text-neutral-200 focus:border-blue-500 focus:outline-none font-mono text-xs"
                placeholder="https://example.com/calendar.ics"
              />
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-neutral-400 mr-1">Color</span>
                {ICAL_COLOR_PALETTE.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewFeedColor(color)}
                    className="w-5 h-5 rounded-full border-2 transition-colors"
                    style={{
                      backgroundColor: color,
                      borderColor: newFeedColor === color ? '#fff' : 'transparent',
                    }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Button variant="primary" size="sm" onClick={addICalSource} disabled={!newFeedName.trim() || !newFeedUrl.trim()}>
                  Add
                </Button>
                <Button variant="secondary" size="sm" onClick={() => { setShowAddForm(false); setNewFeedName(''); setNewFeedUrl(''); }}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setShowAddForm(true)}>
              + Add Feed
            </Button>
          )}

          <p className="text-xs text-neutral-500">
            Add ICS/iCal feed URLs from Google Calendar, Apple Calendar, Outlook, Nextcloud, or any service that provides .ics feeds.
          </p>
        </div>
      </section>

      {/* Shared settings */}
      <section>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Slider
              label="Max Events"
              value={maxEvents}
              min={1}
              max={20}
              onChange={(v) => onChange({ maxEvents: v })}
            />
          </div>
          <div>
            <Slider
              label="Days Ahead"
              value={daysAhead}
              min={1}
              max={30}
              onChange={(v) => onChange({ daysAhead: v })}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
