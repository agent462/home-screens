import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { readConfig, writeConfig } from '../config';

// Override process.cwd to use a temp directory for tests
let tmpDir: string;
let origCwd: () => string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'home-screens-test-'));
  origCwd = process.cwd;
  process.cwd = () => tmpDir;
});

afterEach(async () => {
  process.cwd = origCwd;
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('readConfig', () => {
  it('returns default config when file does not exist', async () => {
    const config = await readConfig();
    expect(config.version).toBe(1);
    expect(config.screens).toHaveLength(1);
    expect(config.screens[0].id).toBe('default');
    expect(config.settings.weather.provider).toBe('weatherapi');
  });

  it('reads existing config file', async () => {
    const configDir = path.join(tmpDir, 'data');
    await fs.mkdir(configDir, { recursive: true });
    const custom = {
      version: 2,
      settings: { rotationIntervalMs: 5000, weather: {}, calendar: {} },
      screens: [{ id: 'custom', name: 'My Screen', backgroundImage: '', modules: [] }],
    };
    await fs.writeFile(path.join(configDir, 'config.json'), JSON.stringify(custom));

    const config = await readConfig();
    expect(config.version).toBe(2);
    expect(config.screens[0].id).toBe('custom');
  });
});

describe('writeConfig', () => {
  it('writes config atomically (via temp file rename)', async () => {
    const config = {
      version: 1,
      settings: {
        rotationIntervalMs: 30000,
        displayWidth: 1080,
        displayHeight: 1920,
        weather: { provider: 'weatherapi' as const, apiKey: '', latitude: 0, longitude: 0, units: 'imperial' as const },
        calendar: { googleCalendarId: '', googleCalendarIds: [], maxEvents: 10, daysAhead: 7 },
      },
      screens: [{ id: 'test', name: 'Test', backgroundImage: '', modules: [] }],
    };
    await writeConfig(config);

    const filePath = path.join(tmpDir, 'data', 'config.json');
    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.screens[0].id).toBe('test');

    // Verify no leftover .tmp file
    const files = await fs.readdir(path.join(tmpDir, 'data'));
    expect(files).not.toContain('config.json.tmp');
  });

  it('creates data directory if it does not exist', async () => {
    const config = {
      version: 1,
      settings: {
        rotationIntervalMs: 30000,
        displayWidth: 1080,
        displayHeight: 1920,
        weather: { provider: 'weatherapi' as const, apiKey: '', latitude: 0, longitude: 0, units: 'imperial' as const },
        calendar: { googleCalendarId: '', googleCalendarIds: [], maxEvents: 10, daysAhead: 7 },
      },
      screens: [],
    };
    await writeConfig(config);

    const stat = await fs.stat(path.join(tmpDir, 'data'));
    expect(stat.isDirectory()).toBe(true);
  });

  it('round-trips: write then read returns same data', async () => {
    const config = {
      version: 1,
      settings: {
        rotationIntervalMs: 15000,
        displayWidth: 1080,
        displayHeight: 1920,
        weather: { provider: 'openweathermap' as const, apiKey: 'abc', latitude: 40.7, longitude: -74.0, units: 'metric' as const },
        calendar: { googleCalendarId: 'cal1', googleCalendarIds: ['cal1', 'cal2'], maxEvents: 5, daysAhead: 14 },
      },
      screens: [
        { id: 's1', name: 'Living Room', backgroundImage: '/bg.jpg', modules: [] },
        { id: 's2', name: 'Kitchen', backgroundImage: '', modules: [] },
      ],
    };
    await writeConfig(config);
    const result = await readConfig();

    expect(result).toEqual(config);
  });
});
