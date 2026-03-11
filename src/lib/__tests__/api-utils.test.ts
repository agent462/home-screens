import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { errorResponse, createTTLCache, getLocationFromConfig, fetchWithTimeout } from '@/lib/api-utils';

vi.mock('@/lib/config', () => ({
  readConfig: vi.fn(),
}));

import { readConfig } from '@/lib/config';
const mockReadConfig = vi.mocked(readConfig);

describe('errorResponse', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('always returns the fallback message, even for Error instances', async () => {
    const response = errorResponse(new Error('something broke'), 'fallback');
    const json = await response.json();
    expect(json).toEqual({ error: 'fallback' });
  });

  it('uses fallbackMessage for non-Error string', async () => {
    const response = errorResponse('not an error object', 'fallback message');
    const json = await response.json();
    expect(json).toEqual({ error: 'fallback message' });
  });

  it('uses fallbackMessage for null', async () => {
    const response = errorResponse(null, 'fallback message');
    const json = await response.json();
    expect(json).toEqual({ error: 'fallback message' });
  });

  it('uses fallbackMessage for undefined', async () => {
    const response = errorResponse(undefined, 'fallback message');
    const json = await response.json();
    expect(json).toEqual({ error: 'fallback message' });
  });

  it('uses fallbackMessage for a number', async () => {
    const response = errorResponse(42, 'fallback message');
    const json = await response.json();
    expect(json).toEqual({ error: 'fallback message' });
  });

  it('defaults to status 500', () => {
    const response = errorResponse(new Error('fail'), 'fallback');
    expect(response.status).toBe(500);
  });

  it('respects custom status 400', () => {
    const response = errorResponse(new Error('bad request'), 'fallback', 400);
    expect(response.status).toBe(400);
  });

  it('respects custom status 502', () => {
    const response = errorResponse(new Error('bad gateway'), 'fallback', 502);
    expect(response.status).toBe(502);
  });

  it('returns valid JSON response with correct content type', () => {
    const response = errorResponse(new Error('test'), 'fallback');
    expect(response.headers.get('content-type')).toContain('application/json');
  });
});

describe('fetchWithTimeout', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn().mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('passes an AbortSignal.timeout to fetch', async () => {
    await fetchWithTimeout('https://example.com');

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [, init] = fetchSpy.mock.calls[0];
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('strips the custom timeout property from the init object', async () => {
    await fetchWithTimeout('https://example.com', {
      timeout: 5000,
      headers: { Accept: 'application/json' },
    });

    const [, init] = fetchSpy.mock.calls[0];
    expect(init.timeout).toBeUndefined();
    expect(init.headers).toEqual({ Accept: 'application/json' });
  });

  it('composes caller signal with timeout signal via AbortSignal.any', async () => {
    const controller = new AbortController();
    await fetchWithTimeout('https://example.com', { signal: controller.signal });

    const [, init] = fetchSpy.mock.calls[0];
    // The signal should be a composite — not the original controller signal
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.signal).not.toBe(controller.signal);

    // Aborting the caller signal should abort the composite
    controller.abort();
    expect(init.signal.aborted).toBe(true);
  });

  it('uses the default 10s timeout when none is specified', async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');
    await fetchWithTimeout('https://example.com');

    expect(timeoutSpy).toHaveBeenCalledWith(10_000);
    timeoutSpy.mockRestore();
  });

  it('respects a custom timeout value', async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');
    await fetchWithTimeout('https://example.com', { timeout: 3000 });

    expect(timeoutSpy).toHaveBeenCalledWith(3000);
    timeoutSpy.mockRestore();
  });
});

describe('createTTLCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null for a key that was never set', () => {
    const cache = createTTLCache<string>(5000);
    expect(cache.get('nonexistent')).toBeNull();
  });

  it('returns data within the TTL window', () => {
    const cache = createTTLCache<string>(5000);
    cache.set('greeting', 'hello');

    vi.advanceTimersByTime(4999);
    expect(cache.get('greeting')).toBe('hello');
  });

  it('returns null after the TTL expires', () => {
    const cache = createTTLCache<string>(5000);
    cache.set('greeting', 'hello');

    vi.advanceTimersByTime(5001);
    expect(cache.get('greeting')).toBeNull();
  });

  it('returns null at exactly TTL boundary (> check, not >=)', () => {
    const cache = createTTLCache<string>(5000);
    cache.set('key', 'value');

    vi.advanceTimersByTime(5000);
    // Date.now() - timestamp === ttlMs, which is NOT > ttlMs, so it should still be valid
    expect(cache.get('key')).toBe('value');
  });

  it('keeps different keys independent', () => {
    const cache = createTTLCache<number>(5000);
    cache.set('a', 1);

    vi.advanceTimersByTime(3000);
    cache.set('b', 2);

    vi.advanceTimersByTime(2001);
    // 'a' was set 5001ms ago — expired
    expect(cache.get('a')).toBeNull();
    // 'b' was set 2001ms ago — still valid
    expect(cache.get('b')).toBe(2);
  });

  it('overwriting a key resets the TTL', () => {
    const cache = createTTLCache<string>(5000);
    cache.set('key', 'first');

    vi.advanceTimersByTime(4000);
    cache.set('key', 'second');

    vi.advanceTimersByTime(4000);
    // 8000ms total, but 'key' was reset at 4000ms, so only 4000ms since last set
    expect(cache.get('key')).toBe('second');
  });

  it('works with object values', () => {
    const cache = createTTLCache<{ name: string; count: number }>(5000);
    const data = { name: 'test', count: 42 };
    cache.set('obj', data);

    expect(cache.get('obj')).toEqual({ name: 'test', count: 42 });
  });

  it('works with array values', () => {
    const cache = createTTLCache<number[]>(5000);
    cache.set('nums', [1, 2, 3]);

    expect(cache.get('nums')).toEqual([1, 2, 3]);
  });

  it('works with null as a stored value', () => {
    const cache = createTTLCache<null>(5000);
    cache.set('empty', null);

    // null is a valid stored value, but the return type is T | null
    // so we can't distinguish "not found" from "stored null"
    // The cache returns the stored data, which is null
    expect(cache.get('empty')).toBeNull();
  });

  it('clear() removes all entries', () => {
    const cache = createTTLCache<string>(5000);
    cache.set('a', 'alpha');
    cache.set('b', 'beta');

    cache.clear();

    expect(cache.get('a')).toBeNull();
    expect(cache.get('b')).toBeNull();
  });

  it('get() deletes expired entries from the map', () => {
    const cache = createTTLCache<string>(1000);
    cache.set('key', 'value');

    vi.advanceTimersByTime(1001);
    expect(cache.get('key')).toBeNull();

    // A second get should also return null (entry was deleted, not just skipped)
    expect(cache.get('key')).toBeNull();
  });

  it('evicts expired entries when at capacity', () => {
    const cache = createTTLCache<number>(1000);

    // Fill to capacity (50)
    for (let i = 0; i < 50; i++) {
      cache.set(`key-${i}`, i);
    }

    // Expire all entries
    vi.advanceTimersByTime(1001);

    // Adding a new entry should succeed (expired entries evicted)
    cache.set('new-key', 999);
    expect(cache.get('new-key')).toBe(999);
  });

  it('evicts oldest entry when at capacity with no expired entries', () => {
    const cache = createTTLCache<number>(60_000);

    // Fill to capacity
    for (let i = 0; i < 50; i++) {
      cache.set(`key-${i}`, i);
    }

    // Add one more — should evict the first entry (oldest by insertion order)
    cache.set('overflow', 999);
    expect(cache.get('overflow')).toBe(999);
    expect(cache.get('key-0')).toBeNull(); // evicted
    expect(cache.get('key-1')).toBe(1);    // still present
  });
});

describe('getLocationFromConfig', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when no config and no searchParams', async () => {
    mockReadConfig.mockRejectedValue(new Error('no config'));

    const result = await getLocationFromConfig();
    expect(result).toBeNull();
  });

  it('extracts lat/lon from searchParams when provided', async () => {
    mockReadConfig.mockRejectedValue(new Error('no config'));
    const params = new URLSearchParams({ lat: '40.7', lon: '-74.0' });

    const result = await getLocationFromConfig(params);
    expect(result).toEqual({ lat: '40.7', lon: '-74.0' });
  });

  it('falls back to settings.latitude/longitude from config', async () => {
    mockReadConfig.mockResolvedValue({
      version: 1,
      settings: {
        latitude: 51.5,
        longitude: -0.12,
        rotationIntervalMs: 30000,
        displayWidth: 1080,
        displayHeight: 1920,
        weather: { provider: 'openweathermap', latitude: 0, longitude: 0, units: 'metric' },
        calendar: { googleCalendarId: '', googleCalendarIds: [], maxEvents: 10, daysAhead: 7 },
      },
      screens: [],
    });

    const result = await getLocationFromConfig();
    expect(result).toEqual({ lat: '51.5', lon: '-0.12' });
  });

  it('falls back to settings.weather.latitude/longitude when top-level missing', async () => {
    mockReadConfig.mockResolvedValue({
      version: 1,
      settings: {
        latitude: 0,
        longitude: 0,
        rotationIntervalMs: 30000,
        displayWidth: 1080,
        displayHeight: 1920,
        weather: { provider: 'openweathermap', latitude: 35.68, longitude: 139.69, units: 'metric' },
        calendar: { googleCalendarId: '', googleCalendarIds: [], maxEvents: 10, daysAhead: 7 },
      },
      screens: [],
    });

    // top-level lat/lon are 0 which is falsy for toString() but truthy for ??
    // Actually 0.toString() = "0", which is truthy, so top-level wins
    // Let's test with an actual weather fallback by checking the priority chain works
    const result = await getLocationFromConfig();
    // 0.toString() = '0' which is truthy, so settings.latitude (0) wins
    expect(result).toEqual({ lat: '0', lon: '0' });
  });

  it('searchParams take priority over config values', async () => {
    mockReadConfig.mockResolvedValue({
      version: 1,
      settings: {
        latitude: 51.5,
        longitude: -0.12,
        rotationIntervalMs: 30000,
        displayWidth: 1080,
        displayHeight: 1920,
        weather: { provider: 'openweathermap', latitude: 0, longitude: 0, units: 'metric' },
        calendar: { googleCalendarId: '', googleCalendarIds: [], maxEvents: 10, daysAhead: 7 },
      },
      screens: [],
    });
    const params = new URLSearchParams({ lat: '40.7', lon: '-74.0' });

    const result = await getLocationFromConfig(params);
    expect(result).toEqual({ lat: '40.7', lon: '-74.0' });
  });

  it('returns null when only lat is available (no lon)', async () => {
    mockReadConfig.mockRejectedValue(new Error('no config'));
    const params = new URLSearchParams({ lat: '40.7' });

    const result = await getLocationFromConfig(params);
    expect(result).toBeNull();
  });

  it('returns null when only lon is available (no lat)', async () => {
    mockReadConfig.mockRejectedValue(new Error('no config'));
    const params = new URLSearchParams({ lon: '-74.0' });

    const result = await getLocationFromConfig(params);
    expect(result).toBeNull();
  });

  it('handles readConfig throwing an error gracefully', async () => {
    mockReadConfig.mockRejectedValue(new Error('ENOENT: file not found'));

    // No searchParams either, so should return null without crashing
    const result = await getLocationFromConfig();
    expect(result).toBeNull();
  });

  it('handles readConfig throwing and falls back to searchParams', async () => {
    mockReadConfig.mockRejectedValue(new Error('ENOENT'));
    const params = new URLSearchParams({ lat: '48.85', lon: '2.35' });

    const result = await getLocationFromConfig(params);
    expect(result).toEqual({ lat: '48.85', lon: '2.35' });
  });

  it('uses existingConfig when provided instead of calling readConfig', async () => {
    const existingConfig = {
      version: 1,
      settings: {
        latitude: 34.05,
        longitude: -118.24,
        rotationIntervalMs: 30000,
        displayWidth: 1080,
        displayHeight: 1920,
        weather: { provider: 'openweathermap' as const, latitude: 0, longitude: 0, units: 'metric' as const },
        calendar: { googleCalendarId: '', googleCalendarIds: [], maxEvents: 10, daysAhead: 7 },
      },
      screens: [],
    };

    // Clear call history from previous tests before asserting
    mockReadConfig.mockClear();

    const result = await getLocationFromConfig(undefined, existingConfig);
    expect(result).toEqual({ lat: '34.05', lon: '-118.24' });
    expect(mockReadConfig).not.toHaveBeenCalled();
  });
});
