'use client';

import { useState, useEffect, useCallback } from 'react';
import { editorFetch } from '@/lib/editor-fetch';
import { useEditorStore } from '@/stores/editor-store';
import Button from '@/components/ui/Button';

type SecretKey = 'openweathermap_key' | 'weatherapi_key';

interface WeatherSettings {
  provider: string;
  units: string;
  lat: string;
  lon: string;
}

interface Props {
  values: WeatherSettings;
  onChange: (updates: Partial<WeatherSettings>) => void;
}

function providerSecretKey(provider: string): SecretKey {
  return provider === 'openweathermap' ? 'openweathermap_key' : 'weatherapi_key';
}

export default function WeatherSection({ values, onChange }: Props) {
  const { provider, units, lat, lon } = values;
  const { updateSettings, saveConfig } = useEditorStore();

  const [apiKey, setApiKey] = useState('');
  const [keyConfigured, setKeyConfigured] = useState(false);
  const [keyLoading, setKeyLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');
  const [testStatus, setTestStatus] = useState<string | null>(null);

  const fetchKeyStatus = useCallback(async () => {
    try {
      const res = await editorFetch('/api/secrets');
      if (res.ok) {
        const data: Partial<Record<string, boolean>> = await res.json();
        const key = providerSecretKey(provider);
        setKeyConfigured(!!data[key]);
      }
    } catch {
      // ignore
    } finally {
      setKeyLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    setKeyLoading(true);
    fetchKeyStatus();
  }, [fetchKeyStatus]);

  async function handleSaveKey(): Promise<boolean> {
    if (!apiKey.trim()) return false;
    setSaveStatus('saving');
    setSaveError('');
    try {
      const res = await editorFetch('/api/secrets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: providerSecretKey(provider), value: apiKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveStatus('error');
        setSaveError(data.error ?? 'Failed to save');
        return false;
      }
      setSaveStatus('saved');
      setApiKey('');
      await fetchKeyStatus();
      setTimeout(() => setSaveStatus('idle'), 3000);
      return true;
    } catch {
      setSaveStatus('error');
      setSaveError('Network error');
      return false;
    }
  }

  async function handleDeleteKey() {
    try {
      const res = await editorFetch('/api/secrets', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: providerSecretKey(provider) }),
      });
      if (res.ok) await fetchKeyStatus();
    } catch {
      // ignore
    }
  }

  async function testWeather() {
    // If user typed a key but hasn't saved, save first
    if (apiKey.trim()) {
      const saved = await handleSaveKey();
      if (!saved) return;
    }

    setTestStatus('Testing...');
    try {
      const testLat = parseFloat(lat) || 0;
      const testLon = parseFloat(lon) || 0;
      updateSettings({
        latitude: testLat,
        longitude: testLon,
        weather: {
          provider: provider as 'openweathermap' | 'weatherapi',
          latitude: testLat,
          longitude: testLon,
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
    <section>
      <h3 className="text-sm font-medium text-neutral-300 mb-3 uppercase tracking-wider">
        Weather
      </h3>
      <div className="space-y-3">
        <label className="block">
          <span className="text-xs text-neutral-400">Provider</span>
          <select
            value={provider}
            onChange={(e) => onChange({ provider: e.target.value })}
            className="mt-1 block w-full rounded-md bg-neutral-800 border border-neutral-600 text-sm text-neutral-200 px-3 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="weatherapi">WeatherAPI.com (free, no credit card)</option>
            <option value="openweathermap">OpenWeatherMap (One Call 3.0)</option>
          </select>
        </label>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
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
            <div className="flex items-center gap-2">
              {!keyLoading && (
                <>
                  <span className="flex items-center gap-1.5 text-xs">
                    <span
                      className={`w-1.5 h-1.5 rounded-full inline-block ${
                        keyConfigured ? 'bg-green-400' : 'bg-neutral-600'
                      }`}
                    />
                    <span className={keyConfigured ? 'text-green-400' : 'text-neutral-500'}>
                      {keyConfigured ? 'Configured' : 'Not configured'}
                    </span>
                  </span>
                  {keyConfigured && (
                    <button
                      onClick={handleDeleteKey}
                      className="text-xs text-neutral-500 hover:text-red-400 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setSaveStatus('idle'); }}
              placeholder="Paste your API key here"
              className="flex-1 rounded-md bg-neutral-800 border border-neutral-600 text-sm text-neutral-200 px-3 py-2 focus:outline-none focus:border-blue-500"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSaveKey}
              disabled={!apiKey.trim() || saveStatus === 'saving'}
            >
              {saveStatus === 'saving' ? '...' : 'Save'}
            </Button>
          </div>
          {saveStatus === 'saved' && (
            <span className="text-xs text-green-400">Key saved successfully</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-xs text-red-400">{saveError}</span>
          )}
        </div>

        <label className="block">
          <span className="text-xs text-neutral-400">Units</span>
          <select
            value={units}
            onChange={(e) => onChange({ units: e.target.value })}
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
  );
}
