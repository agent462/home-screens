'use client';

import { useState } from 'react';
import { useEditorStore } from '@/stores/editor-store';
import Button from '@/components/ui/Button';

interface WeatherSettings {
  weatherApiKey: string;
  provider: string;
  units: string;
  lat: string;
  lon: string;
}

interface Props {
  values: WeatherSettings;
  onChange: (updates: Partial<WeatherSettings>) => void;
}

export default function WeatherSection({ values, onChange }: Props) {
  const { weatherApiKey, provider, units, lat, lon } = values;
  const { updateSettings, saveConfig } = useEditorStore();

  const [testStatus, setTestStatus] = useState<string | null>(null);

  async function testWeather() {
    setTestStatus('Testing...');
    try {
      const testLat = parseFloat(lat) || 0;
      const testLon = parseFloat(lon) || 0;
      updateSettings({
        latitude: testLat,
        longitude: testLon,
        weather: {
          provider: provider as 'openweathermap' | 'weatherapi',
          apiKey: weatherApiKey,
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
            onChange={(e) => onChange({ weatherApiKey: e.target.value })}
            placeholder="Paste your API key here"
            className="mt-1 block w-full rounded-md bg-neutral-800 border border-neutral-600 text-sm text-neutral-200 px-3 py-2 focus:outline-none focus:border-blue-500"
          />
        </label>

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
