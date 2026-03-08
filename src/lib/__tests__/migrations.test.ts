import { describe, it, expect } from 'vitest';
import { migrateUp, migrateDown, getMigrations, getLatestSchemaVersion } from '../migrations';
import type { ScreenConfiguration } from '@/types/config';

function makeConfig(version: number): ScreenConfiguration {
  return {
    version,
    settings: {
      rotationIntervalMs: 30000,
      displayWidth: 1080,
      displayHeight: 1920,
      weather: {
        provider: 'weatherapi',
        apiKey: '',
        latitude: 0,
        longitude: 0,
        units: 'imperial',
      },
      calendar: {
        googleCalendarId: '',
        googleCalendarIds: [],
        maxEvents: 10,
        daysAhead: 7,
      },
    },
    screens: [
      {
        id: 'default',
        name: 'Screen 1',
        backgroundImage: '/backgrounds/default.svg',
        modules: [],
      },
    ],
  };
}

describe('migrations', () => {
  it('getMigrations returns sorted migrations', () => {
    const migrations = getMigrations();
    expect(migrations.length).toBeGreaterThan(0);
    for (let i = 1; i < migrations.length; i++) {
      expect(migrations[i].version).toBeGreaterThan(migrations[i - 1].version);
    }
  });

  it('getLatestSchemaVersion returns at least 1', () => {
    expect(getLatestSchemaVersion()).toBeGreaterThanOrEqual(1);
  });

  it('migrateUp with no needed migrations returns config unchanged', () => {
    const config = makeConfig(1);
    const { config: result, migrationsRun } = migrateUp(config, 1);
    expect(migrationsRun).toHaveLength(0);
    expect(result.version).toBe(1);
  });

  it('migrateDown with no needed migrations returns config unchanged', () => {
    const config = makeConfig(1);
    const { config: result, migrationsRun } = migrateDown(config, 1);
    expect(migrationsRun).toHaveLength(0);
    expect(result.version).toBe(1);
  });

  it('migrateUp does not mutate the original config', () => {
    const config = makeConfig(1);
    const original = JSON.stringify(config);
    migrateUp(config);
    expect(JSON.stringify(config)).toBe(original);
  });
});
