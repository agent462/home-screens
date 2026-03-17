'use client';

import { useState, useEffect, useCallback } from 'react';
import { editorFetch } from '@/lib/editor-fetch';
import type { ICalSource } from '@/types/config';
import Slider from '@/components/ui/Slider';
import Button from '@/components/ui/Button';
import { useGoogleDeviceFlow } from '@/hooks/useGoogleDeviceFlow';
import { useGoogleCalendars } from '@/hooks/useGoogleCalendars';
import ICalFeedManager from './ICalFeedManager';

interface HolidayCountry {
  countryCode: string;
  name: string;
}

interface CalendarSettings {
  selectedCalendarIds: string[];
  icalSources: ICalSource[];
  maxEvents: number;
  daysAhead: number;
  holidayCountry?: string;
}

interface Props {
  values: CalendarSettings;
  onChange: (updates: Partial<CalendarSettings>) => void;
}

export default function CalendarSection({ values, onChange }: Props) {
  const { selectedCalendarIds, icalSources, maxEvents, daysAhead, holidayCountry } = values;

  const [availableCountries, setAvailableCountries] = useState<HolidayCountry[]>([]);

  // Track auth errors from useGoogleCalendars separately so they show in the right place
  const [authError, setAuthError] = useState<string | null>(null);

  const onAuthError = useCallback((message: string) => {
    setAuthError(message);
  }, []);

  const {
    credentialsConfigured,
    googleConnected,
    googleCalendars,
    googleLoading,
    setGoogleConnected,
    fetchCalendars,
    toggleCalendar,
    disconnectGoogle: disconnectGoogleCalendars,
  } = useGoogleCalendars({
    values,
    onChange,
    onAuthError,
  });

  const deviceFlow = useGoogleDeviceFlow({
    onSuccess: async () => {
      setAuthError(null);
      setGoogleConnected(true);
      await fetchCalendars(true);
    },
  });

  const disconnectGoogle = useCallback(async () => {
    await disconnectGoogleCalendars();
    deviceFlow.clearError();
    setAuthError(null);
  }, [disconnectGoogleCalendars, deviceFlow]);

  // Combine device flow errors from both sources
  const combinedError = deviceFlow.deviceFlowError || authError;

  // Fetch available countries for holiday picker
  useEffect(() => {
    async function fetchCountries() {
      try {
        const res = await editorFetch('/api/holidays?countries');
        if (res.ok) setAvailableCountries(await res.json());
      } catch { /* ignore */ }
    }
    fetchCountries();
  }, []);

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

              {combinedError && (
                <p className="text-xs text-amber-400">{combinedError}</p>
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
              {deviceFlow.userCode && deviceFlow.verificationUrl ? (
                <div className="space-y-3">
                  <p className="text-xs text-neutral-400">
                    Open the link below on your phone or computer, then enter the code:
                  </p>
                  <div className="flex items-center gap-3">
                    <a
                      href={deviceFlow.verificationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-400 hover:text-blue-300 underline"
                    >
                      {deviceFlow.verificationUrl}
                    </a>
                  </div>
                  <div className="flex items-center gap-3">
                    <code className="text-2xl font-bold tracking-widest text-neutral-100 bg-neutral-800 border border-neutral-600 rounded-lg px-4 py-2">
                      {deviceFlow.userCode}
                    </code>
                    {deviceFlow.deviceFlowPolling && (
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
                  onClick={deviceFlow.startDeviceFlow}
                  disabled={deviceFlow.deviceFlowPolling}
                >
                  Sign in with Google
                </Button>
              )}
              {deviceFlow.deviceFlowError && (
                <div className="space-y-1.5">
                  <p className="text-xs text-red-400">{deviceFlow.deviceFlowError}</p>
                  {deviceFlow.clientIdHint && (
                    <p className="text-xs text-neutral-500">
                      Using Client ID: <code className="text-neutral-400">{deviceFlow.clientIdHint}</code>
                    </p>
                  )}
                  <p className="text-xs text-neutral-500">
                    Verify your credentials in{' '}
                    <a
                      href="/editor/settings?tab=integrations"
                      className="text-blue-400 hover:text-blue-300 underline"
                    >
                      Settings &rarr; Integrations
                    </a>
                    {', or check your '}
                    <a
                      href="https://console.cloud.google.com/apis/credentials"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline"
                    >
                      Google Cloud Console
                    </a>
                    .
                  </p>
                </div>
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
      <ICalFeedManager icalSources={icalSources} onChange={onChange} />

      {/* Public Holidays section */}
      <section>
        <h3 className="text-sm font-medium text-neutral-300 mb-3 uppercase tracking-wider">
          Public Holidays
        </h3>
        <div className="space-y-2">
          <select
            value={holidayCountry ?? ''}
            onChange={(e) => onChange({ holidayCountry: e.target.value || undefined })}
            className="w-full rounded-md bg-neutral-800 border border-neutral-600 px-2.5 py-1.5 text-sm text-neutral-200 focus:border-blue-500 focus:outline-none"
          >
            <option value="">None</option>
            {availableCountries.map((c) => (
              <option key={c.countryCode} value={c.countryCode}>
                {c.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-neutral-500">
            Show public holidays on calendar widgets. Data from Nager.Date.
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
              max={100}
              onChange={(v) => onChange({ maxEvents: v })}
            />
          </div>
          <div>
            <Slider
              label="Days Ahead"
              value={daysAhead}
              min={1}
              max={90}
              onChange={(v) => onChange({ daysAhead: v })}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
