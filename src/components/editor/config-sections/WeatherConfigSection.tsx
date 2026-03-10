'use client';

import { useState, useEffect } from 'react';
import Toggle from '@/components/ui/Toggle';
import Slider from '@/components/ui/Slider';
import { editorFetch } from '@/lib/editor-fetch';
import { useModuleConfig } from '@/hooks/useModuleConfig';
import { INPUT_CLASS } from '@/components/editor/PropertyPanel';
import type { ModuleInstance, WeatherView, WeatherIconSet, WeatherProviderOption } from '@/types/config';

const WEATHER_VIEWS: { value: WeatherView; label: string }[] = [
  { value: 'current', label: 'Current Only' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily Forecast' },
  { value: 'combined', label: 'Combined' },
  { value: 'compact', label: 'Compact' },
  { value: 'table', label: 'Table' },
  { value: 'precipitation', label: 'Precipitation (Pirate Weather)' },
  { value: 'alerts', label: 'Weather Alerts (Pirate Weather)' },
];

export function WeatherConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { config: c, set } = useModuleConfig<{
    view?: WeatherView;
    iconSet?: WeatherIconSet;
    provider?: WeatherProviderOption;
    hoursToShow?: number;
    showFeelsLike?: boolean;
    daysToShow?: number;
    showHighLow?: boolean;
    showPrecipitation?: boolean;
    showPrecipAmount?: boolean;
    showHumidity?: boolean;
    showWind?: boolean;
  }>(mod, screenId);

  const [configuredProviders, setConfiguredProviders] = useState<string[]>([]);
  useEffect(() => {
    async function check() {
      try {
        const res = await editorFetch('/api/secrets');
        if (res.ok) {
          const data: Record<string, boolean> = await res.json();
          const providers: string[] = [];
          if (data.openweathermap_key) providers.push('openweathermap');
          if (data.weatherapi_key) providers.push('weatherapi');
          if (data.pirateweather_key) providers.push('pirateweather');
          setConfiguredProviders(providers);
        }
      } catch { /* ignore */ }
    }
    check();
  }, []);

  const view = c.view ?? 'hourly';
  const showsHours = view === 'hourly' || view === 'combined';
  const showsDays = view === 'daily' || view === 'combined' || view === 'table';
  const showsCurrent = ['current', 'hourly', 'combined', 'compact'].includes(view);

  return (
    <>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">View</span>
        <select
          value={view}
          onChange={(e) => set({ view: e.target.value as WeatherView })}
          className={INPUT_CLASS}
        >
          {WEATHER_VIEWS.map((v) => (
            <option key={v.value} value={v.value}>{v.label}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Icon Style</span>
        <select
          value={c.iconSet ?? 'color'}
          onChange={(e) => set({ iconSet: e.target.value as WeatherIconSet })}
          className={INPUT_CLASS}
        >
          <option value="outline">Outline</option>
          <option value="color">Color</option>
        </select>
      </label>
      {configuredProviders.length > 0 && (
        <label className="flex flex-col gap-0.5">
          <span className="text-xs text-neutral-400">Data Provider</span>
          <select
            value={c.provider ?? 'global'}
            onChange={(e) => set({ provider: e.target.value as WeatherProviderOption })}
            className={INPUT_CLASS}
          >
            <option value="global">Global Default</option>
            {configuredProviders.includes('openweathermap') && (
              <option value="openweathermap">OpenWeatherMap</option>
            )}
            {configuredProviders.includes('weatherapi') && (
              <option value="weatherapi">WeatherAPI</option>
            )}
            {configuredProviders.includes('pirateweather') && (
              <option value="pirateweather">Pirate Weather</option>
            )}
          </select>
        </label>
      )}
      {showsHours && (
        <label className="flex flex-col gap-0.5">
          <span className="text-xs text-neutral-400">Hours to Show</span>
          <input
            type="number"
            value={c.hoursToShow ?? 8}
            onChange={(e) => set({ hoursToShow: Number(e.target.value) })}
            className={INPUT_CLASS}
          />
        </label>
      )}
      {showsDays && (
        <label className="flex flex-col gap-0.5">
          <span className="text-xs text-neutral-400">Days to Show</span>
          <input
            type="number"
            value={c.daysToShow ?? 5}
            onChange={(e) => set({ daysToShow: Number(e.target.value) })}
            className={INPUT_CLASS}
          />
        </label>
      )}
      {showsCurrent && (
        <Toggle label="Feels Like" checked={c.showFeelsLike !== false} onChange={(v) => set({ showFeelsLike: v })} />
      )}
      {showsDays && (
        <Toggle label="High / Low" checked={c.showHighLow !== false} onChange={(v) => set({ showHighLow: v })} />
      )}
      <Toggle label="Precipitation" checked={c.showPrecipitation !== false} onChange={(v) => set({ showPrecipitation: v })} />
      {showsDays && (
        <Toggle label="Precipitation Amount" checked={!!c.showPrecipAmount} onChange={(v) => set({ showPrecipAmount: v })} />
      )}
      <Toggle label="Humidity" checked={!!c.showHumidity} onChange={(v) => set({ showHumidity: v })} />
      <Toggle label="Wind Speed" checked={!!c.showWind} onChange={(v) => set({ showWind: v })} />
    </>
  );
}
