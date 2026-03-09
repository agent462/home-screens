'use client';

import { useState, useEffect, useCallback } from 'react';
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
  maxEvents: number;
  daysAhead: number;
}

interface Props {
  values: CalendarSettings;
  onChange: (updates: Partial<CalendarSettings>) => void;
}

export default function CalendarSection({ values, onChange }: Props) {
  const { selectedCalendarIds, maxEvents, daysAhead } = values;

  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleCalendars, setGoogleCalendars] = useState<GoogleCalendar[]>([]);
  const [googleLoading, setGoogleLoading] = useState(true);

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
        if (selectedCalendarIds.length === 0 && cals.length > 0) {
          const primary = cals.find((c) => c.primary);
          if (primary) onChange({ selectedCalendarIds: [primary.id] });
        }
      }
    } catch {
      // ignore
    }
  }, [selectedCalendarIds.length, onChange]);

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
    const next = selectedCalendarIds.includes(id)
      ? selectedCalendarIds.filter((c) => c !== id)
      : [...selectedCalendarIds, id];
    onChange({ selectedCalendarIds: next });
  }

  async function disconnectGoogle() {
    await fetch('/api/auth/google/status', { method: 'DELETE' });
    setGoogleConnected(false);
    setGoogleCalendars([]);
    onChange({ selectedCalendarIds: [] });
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
    const pollInterval = Math.max(interval, 5) * 1000;

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
        setDeviceFlowPolling(false);
        setDeviceFlowError(data.error || 'Authorization failed');
        setUserCode(null);
      } catch {
        setTimeout(poll, pollInterval);
      }
    };

    setTimeout(poll, pollInterval);
  }

  return (
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
      </div>
    </section>
  );
}
