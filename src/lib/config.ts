import { promises as fs } from 'fs';
import path from 'path';
import type { ScreenConfiguration } from '@/types/config';
import { CONFIG_FILE_PATH } from './constants';

function getConfigPath(): string {
  return path.join(process.cwd(), CONFIG_FILE_PATH);
}

const DEFAULT_CONFIG: ScreenConfiguration = {
  version: 1,
  settings: {
    rotationIntervalMs: 30000,
    displayWidth: 1080,
    displayHeight: 1920,
    latitude: 0,
    longitude: 0,
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

export async function readConfig(): Promise<ScreenConfiguration> {
  const filePath = getConfigPath();
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data) as ScreenConfiguration;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function writeConfig(config: ScreenConfiguration): Promise<void> {
  const filePath = getConfigPath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmp = filePath + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(config, null, 2), 'utf-8');
  await fs.rename(tmp, filePath);
}
