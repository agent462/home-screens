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
    const original = process.env.OPENWEATHERMAP_API_KEY;
    delete process.env.OPENWEATHERMAP_API_KEY;
    expect(() => new OpenWeatherMapProvider()).toThrow('OPENWEATHERMAP_API_KEY is not configured');
    process.env.OPENWEATHERMAP_API_KEY = original;
  });

  describe('icon mapping', () => {
    // Access private method via prototype for testing the pure mapping
    const provider = new OpenWeatherMapProvider('test-key');
    const mapIcon = (provider as unknown as { mapIcon: (code: string) => string }).mapIcon.bind(provider);

    it('maps clear day/night correctly', () => {
      expect(mapIcon('01d')).toBe('☀️');
      expect(mapIcon('01n')).toBe('🌙');
    });

    it('maps rain codes', () => {
      expect(mapIcon('09d')).toBe('🌧️');
      expect(mapIcon('10d')).toBe('🌦️');
    });

    it('maps thunderstorm', () => {
      expect(mapIcon('11d')).toBe('⛈️');
    });

    it('maps snow', () => {
      expect(mapIcon('13d')).toBe('❄️');
    });

    it('maps fog/mist', () => {
      expect(mapIcon('50d')).toBe('🌫️');
    });

    it('returns fallback for unknown codes', () => {
      expect(mapIcon('99z')).toBe('🌡️');
      expect(mapIcon('')).toBe('🌡️');
    });
  });
});

describe('WeatherAPIProvider', () => {
  it('throws without API key', () => {
    const original = process.env.WEATHERAPI_KEY;
    delete process.env.WEATHERAPI_KEY;
    expect(() => new WeatherAPIProvider()).toThrow('WEATHERAPI_KEY is not configured');
    process.env.WEATHERAPI_KEY = original;
  });

  describe('condition code mapping', () => {
    const provider = new WeatherAPIProvider('test-key');
    const mapCondition = (provider as unknown as { mapConditionToEmoji: (code: number, isDay: boolean) => string }).mapConditionToEmoji.bind(provider);

    it('maps clear sky day vs night', () => {
      expect(mapCondition(1000, true)).toBe('☀️');
      expect(mapCondition(1000, false)).toBe('🌙');
    });

    it('maps partly cloudy day vs night', () => {
      expect(mapCondition(1003, true)).toBe('⛅');
      expect(mapCondition(1003, false)).toBe('☁️');
    });

    it('maps overcast', () => {
      expect(mapCondition(1006, true)).toBe('☁️');
      expect(mapCondition(1009, false)).toBe('☁️');
    });

    it('maps light rain', () => {
      expect(mapCondition(1063, true)).toBe('🌦️');
      expect(mapCondition(1183, true)).toBe('🌦️');
    });

    it('maps heavy rain', () => {
      expect(mapCondition(1195, true)).toBe('🌧️');
    });

    it('maps snow', () => {
      expect(mapCondition(1066, true)).toBe('❄️');
      expect(mapCondition(1225, true)).toBe('❄️');
    });

    it('maps thunderstorm', () => {
      expect(mapCondition(1087, true)).toBe('⛈️');
      expect(mapCondition(1276, true)).toBe('⛈️');
    });

    it('returns fallback for unmapped codes', () => {
      expect(mapCondition(9999, true)).toBe('🌡️');
    });
  });
});
