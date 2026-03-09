import { describe, it, expect } from 'vitest';
import { OpenWeatherMapProvider, WeatherAPIProvider, createWeatherProvider } from '../weather';

describe('createWeatherProvider', () => {
  it('creates OpenWeatherMap provider', () => {
    const provider = createWeatherProvider('openweathermap', 'test-key');
    expect(provider).toBeInstanceOf(OpenWeatherMapProvider);
  });

  it('creates WeatherAPI provider', () => {
    const provider = createWeatherProvider('weatherapi', 'test-key');
    expect(provider).toBeInstanceOf(WeatherAPIProvider);
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
