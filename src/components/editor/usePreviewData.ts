'use client';

import { useState, useEffect } from 'react';

interface ProviderWeatherData {
  hourly: unknown[] | null;
  forecast: unknown[] | null;
  minutely: unknown[] | null;
  alerts: unknown[] | null;
}

export interface PreviewData {
  weatherByProvider: Record<string, ProviderWeatherData>;
  calendarEvents: unknown[] | null;
}

export function usePreviewData(): PreviewData {
  const [previewData, setPreviewData] = useState<PreviewData>({
    weatherByProvider: {},
    calendarEvents: null,
  });

  useEffect(() => {
    async function fetchPreviewData() {
      // Fetch both providers in parallel; the server-side cache + secrets
      // check means unconfigured providers will simply fail gracefully
      const providers = ['openweathermap', 'weatherapi', 'pirateweather', 'noaa', 'open-meteo'] as const;
      const results = await Promise.allSettled(
        providers.map(async (p) => {
          const res = await fetch(`/api/weather?provider=${p}`);
          if (!res.ok) return null;
          const data = await res.json();
          return { provider: p, hourly: data.hourly ?? null, forecast: data.forecast ?? null, minutely: data.minutely ?? null, alerts: data.alerts ?? null };
        }),
      );

      const byProvider: Record<string, ProviderWeatherData> = {};
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          byProvider[result.value.provider] = {
            hourly: result.value.hourly,
            forecast: result.value.forecast,
            minutely: result.value.minutely,
            alerts: result.value.alerts,
          };
        }
      }
      setPreviewData((prev) => ({ ...prev, weatherByProvider: byProvider }));

      try {
        const calRes = await fetch('/api/calendar');
        if (calRes.ok) {
          const calData = await calRes.json();
          const events = Array.isArray(calData.events) ? calData.events : Array.isArray(calData) ? calData : [];
          setPreviewData((prev) => ({ ...prev, calendarEvents: events }));
        }
      } catch {
        // ignore
      }
    }
    fetchPreviewData();
  }, []);

  return previewData;
}
