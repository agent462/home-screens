import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenWeatherMapProvider, WeatherAPIProvider, OpenMeteoProvider, createWeatherProvider } from '../weather';

describe('createWeatherProvider', () => {
  it('creates OpenWeatherMap provider', () => {
    const provider = createWeatherProvider('openweathermap', 'test-key');
    expect(provider).toBeInstanceOf(OpenWeatherMapProvider);
  });

  it('creates WeatherAPI provider', () => {
    const provider = createWeatherProvider('weatherapi', 'test-key');
    expect(provider).toBeInstanceOf(WeatherAPIProvider);
  });

  it('creates Open-Meteo provider', () => {
    const provider = createWeatherProvider('open-meteo');
    expect(provider).toBeInstanceOf(OpenMeteoProvider);
  });

  it('throws on unknown provider', () => {
    expect(() => createWeatherProvider('unknown')).toThrow('Unknown weather provider: unknown');
  });
});

describe('OpenWeatherMapProvider', () => {
  it('throws without API key', () => {
    expect(() => new OpenWeatherMapProvider()).toThrow('OpenWeatherMap API key is not configured');
  });

  describe('icon mapping', () => {
    const provider = new OpenWeatherMapProvider('test-key');
    const mapIcon = (provider as unknown as { mapIcon: (code: string) => string }).mapIcon.bind(provider);

    it('maps clear day/night correctly', () => {
      expect(mapIcon('01d')).toBe('sun');
      expect(mapIcon('01n')).toBe('moon');
    });

    it('maps rain codes', () => {
      expect(mapIcon('09d')).toBe('cloud-rain');
      expect(mapIcon('10d')).toBe('cloud-drizzle');
    });

    it('maps thunderstorm', () => {
      expect(mapIcon('11d')).toBe('cloud-lightning');
    });

    it('maps snow', () => {
      expect(mapIcon('13d')).toBe('snowflake');
    });

    it('maps fog/mist', () => {
      expect(mapIcon('50d')).toBe('cloud-fog');
    });

    it('returns fallback for unknown codes', () => {
      expect(mapIcon('99z')).toBe('thermometer');
      expect(mapIcon('')).toBe('thermometer');
    });
  });
});

describe('OpenMeteoProvider', () => {
  describe('WMO code mapping', () => {
    const provider = new OpenMeteoProvider();
    const mapWMO = (provider as unknown as { mapWMOCode: (code: number, isDay: boolean) => string }).mapWMOCode.bind(provider);

    it('maps clear sky day vs night', () => {
      expect(mapWMO(0, true)).toBe('sun');
      expect(mapWMO(0, false)).toBe('moon');
    });

    it('maps partly cloudy day vs night', () => {
      expect(mapWMO(1, true)).toBe('cloud-sun');
      expect(mapWMO(2, false)).toBe('cloud-moon');
    });

    it('maps overcast', () => {
      expect(mapWMO(3, true)).toBe('cloud');
    });

    it('maps fog', () => {
      expect(mapWMO(45, true)).toBe('cloud-fog');
      expect(mapWMO(48, true)).toBe('cloud-fog');
    });

    it('maps drizzle', () => {
      expect(mapWMO(51, true)).toBe('cloud-drizzle');
      expect(mapWMO(53, true)).toBe('cloud-drizzle');
      expect(mapWMO(55, true)).toBe('cloud-drizzle');
    });

    it('maps rain', () => {
      expect(mapWMO(61, true)).toBe('cloud-rain');
      expect(mapWMO(65, true)).toBe('cloud-rain');
      expect(mapWMO(80, true)).toBe('cloud-rain');
    });

    it('maps snow', () => {
      expect(mapWMO(71, true)).toBe('snowflake');
      expect(mapWMO(75, true)).toBe('snowflake');
      expect(mapWMO(85, true)).toBe('snowflake');
    });

    it('maps thunderstorms', () => {
      expect(mapWMO(95, true)).toBe('cloud-lightning');
      expect(mapWMO(96, true)).toBe('cloud-lightning');
      expect(mapWMO(99, true)).toBe('cloud-lightning');
    });

    it('returns fallback for unmapped codes', () => {
      expect(mapWMO(100, true)).toBe('thermometer');
    });

    it('returns fallback for WMO gap-range codes (4-44)', () => {
      expect(mapWMO(10, true)).toBe('thermometer');
      expect(mapWMO(20, true)).toBe('thermometer');
      expect(mapWMO(30, false)).toBe('thermometer');
      expect(mapWMO(44, true)).toBe('thermometer');
    });
  });

  describe('WMO descriptions', () => {
    const provider = new OpenMeteoProvider();
    const wmoDesc = (provider as unknown as { wmoDescription: (code: number) => string }).wmoDescription.bind(provider);

    it('returns human-readable descriptions', () => {
      expect(wmoDesc(0)).toBe('Clear sky');
      expect(wmoDesc(61)).toBe('Slight rain');
      expect(wmoDesc(95)).toBe('Thunderstorm');
    });

    it('returns Unknown for unmapped codes', () => {
      expect(wmoDesc(100)).toBe('Unknown');
    });
  });

  describe('getHourly', () => {
    const nowSec = Math.floor(Date.now() / 1000);
    // One hour ago (should be included), two hours ago (should be filtered out), one hour ahead
    const pastEpoch = nowSec - 7200;
    const recentEpoch = nowSec - 1800;
    const futureEpoch = nowSec + 3600;

    const mockHourlyResponse = {
      hourly: {
        time: [pastEpoch, recentEpoch, futureEpoch],
        temperature_2m: [60, 65, 70],
        apparent_temperature: [58, 63, 68],
        relative_humidity_2m: [50, 55, 60],
        weather_code: [0, 3, 61],
        wind_speed_10m: [5, 10, 15],
        precipitation_probability: [0, 10, 80],
        surface_pressure: [1013, 1012, 1010],
        dew_point_2m: [40, 42, 45],
        is_day: [1, 1, 0],
      },
    };

    let fetchSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(mockHourlyResponse), { status: 200 }),
      );
    });

    afterEach(() => {
      fetchSpy.mockRestore();
    });

    it('filters out entries older than 1 hour', async () => {
      const provider = new OpenMeteoProvider();
      const results = await provider.getHourly(40.7, -74.0, 'imperial');
      // pastEpoch (2 hours ago) should be excluded; recentEpoch and futureEpoch should be included
      expect(results).toHaveLength(2);
    });

    it('converts epoch timestamps to ISO strings', async () => {
      const provider = new OpenMeteoProvider();
      const results = await provider.getHourly(40.7, -74.0, 'imperial');
      for (const r of results) {
        expect(r.time).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      }
    });

    it('maps all fields correctly', async () => {
      const provider = new OpenMeteoProvider();
      const results = await provider.getHourly(40.7, -74.0, 'imperial');
      const first = results[0];
      expect(first.temp).toBe(65);
      expect(first.feelsLike).toBe(63);
      expect(first.humidity).toBe(55);
      expect(first.icon).toBe('cloud'); // WMO 3 = overcast
      expect(first.description).toBe('Overcast');
      expect(first.windSpeed).toBe(10);
      expect(first.precipProbability).toBe(10);
      expect(first.pressure).toBe(1012);
      expect(first.dewPoint).toBe(42);
    });

    it('uses fahrenheit and mph for imperial units', async () => {
      const provider = new OpenMeteoProvider();
      await provider.getHourly(40.7, -74.0, 'imperial');
      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toContain('temperature_unit=fahrenheit');
      expect(url).toContain('wind_speed_unit=mph');
      expect(url).toContain('timeformat=unixtime');
    });

    it('uses celsius and kmh for metric units', async () => {
      const provider = new OpenMeteoProvider();
      await provider.getHourly(40.7, -74.0, 'metric');
      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toContain('temperature_unit=celsius');
      expect(url).toContain('wind_speed_unit=kmh');
    });

    it('throws on API error', async () => {
      fetchSpy.mockResolvedValueOnce(new Response('Rate limited', { status: 429 }));
      const provider = new OpenMeteoProvider();
      await expect(provider.getHourly(40.7, -74.0, 'imperial')).rejects.toThrow('Open-Meteo API error 429');
    });

    it('handles night-time icons via is_day field', async () => {
      const provider = new OpenMeteoProvider();
      const results = await provider.getHourly(40.7, -74.0, 'imperial');
      const nightEntry = results.find(r => r.icon === 'cloud-rain');
      expect(nightEntry).toBeDefined(); // WMO 61 at night still maps to cloud-rain (not day-dependent)
    });
  });

  describe('getForecast', () => {
    const mockDailyResponse = {
      daily: {
        time: [1710288000, 1710374400, 1710460800],
        temperature_2m_max: [72.5, 68.2, 75.9],
        temperature_2m_min: [55.1, 52.8, 58.3],
        weather_code: [0, 61, 71],
        precipitation_sum: [0, 5.2, 0.8],
        precipitation_probability_max: [5, 85, 30],
        wind_speed_10m_max: [12.4, 22.1, 8.7],
      },
    };

    let fetchSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(mockDailyResponse), { status: 200 }),
      );
    });

    afterEach(() => {
      fetchSpy.mockRestore();
    });

    it('returns correct number of forecast days', async () => {
      const provider = new OpenMeteoProvider();
      const results = await provider.getForecast(40.7, -74.0, 'imperial');
      expect(results).toHaveLength(3);
    });

    it('rounds temperatures to integers', async () => {
      const provider = new OpenMeteoProvider();
      const results = await provider.getForecast(40.7, -74.0, 'imperial');
      expect(results[0].high).toBe(73); // 72.5 → 73
      expect(results[0].low).toBe(55);  // 55.1 → 55
    });

    it('converts epoch dates to YYYY-MM-DD strings', async () => {
      const provider = new OpenMeteoProvider();
      const results = await provider.getForecast(40.7, -74.0, 'imperial');
      for (const r of results) {
        expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });

    it('maps weather codes to icons', async () => {
      const provider = new OpenMeteoProvider();
      const results = await provider.getForecast(40.7, -74.0, 'imperial');
      expect(results[0].icon).toBe('sun');        // WMO 0
      expect(results[1].icon).toBe('cloud-rain');  // WMO 61
      expect(results[2].icon).toBe('snowflake');   // WMO 71
    });

    it('rounds wind speed and includes precip fields', async () => {
      const provider = new OpenMeteoProvider();
      const results = await provider.getForecast(40.7, -74.0, 'imperial');
      expect(results[1].windSpeed).toBe(22); // 22.1 → 22
      expect(results[1].precipProbability).toBe(85);
      expect(results[1].precipAmount).toBe(5.2);
    });

    it('throws on API error', async () => {
      fetchSpy.mockResolvedValueOnce(new Response('Server error', { status: 500 }));
      const provider = new OpenMeteoProvider();
      await expect(provider.getForecast(40.7, -74.0, 'imperial')).rejects.toThrow('Open-Meteo API error 500');
    });
  });
});

describe('WeatherAPIProvider', () => {
  it('throws without API key', () => {
    expect(() => new WeatherAPIProvider()).toThrow('WeatherAPI key is not configured');
  });

  describe('condition code mapping', () => {
    const provider = new WeatherAPIProvider('test-key');
    const mapCondition = (provider as unknown as { mapConditionToIcon: (code: number, isDay: boolean) => string }).mapConditionToIcon.bind(provider);

    it('maps clear sky day vs night', () => {
      expect(mapCondition(1000, true)).toBe('sun');
      expect(mapCondition(1000, false)).toBe('moon');
    });

    it('maps partly cloudy day vs night', () => {
      expect(mapCondition(1003, true)).toBe('cloud-sun');
      expect(mapCondition(1003, false)).toBe('cloud-moon');
    });

    it('maps overcast', () => {
      expect(mapCondition(1006, true)).toBe('cloud');
      expect(mapCondition(1009, false)).toBe('cloud');
    });

    it('maps light rain', () => {
      expect(mapCondition(1063, true)).toBe('cloud-drizzle');
      expect(mapCondition(1183, true)).toBe('cloud-drizzle');
    });

    it('maps heavy rain', () => {
      expect(mapCondition(1195, true)).toBe('cloud-rain');
    });

    it('maps snow', () => {
      expect(mapCondition(1066, true)).toBe('snowflake');
      expect(mapCondition(1225, true)).toBe('snowflake');
    });

    it('maps thunderstorm', () => {
      expect(mapCondition(1087, true)).toBe('cloud-lightning');
      expect(mapCondition(1276, true)).toBe('cloud-lightning');
    });

    it('returns fallback for unmapped codes', () => {
      expect(mapCondition(9999, true)).toBe('thermometer');
    });
  });
});
