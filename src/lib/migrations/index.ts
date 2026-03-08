import type { ScreenConfiguration } from '@/types/config';

export interface Migration {
  version: number;
  description: string;
  up(config: ScreenConfiguration): ScreenConfiguration;
  down(config: ScreenConfiguration): ScreenConfiguration;
}

// Import all migrations in order
// Each migration takes config from version N-1 to version N
const migrations: Migration[] = [
  // Migration 001: baseline (v1) - no-op, establishes the starting schema
  {
    version: 1,
    description: 'Baseline schema',
    up: (config) => ({ ...config, version: 1 }),
    down: (config) => ({ ...config, version: 1 }),
  },
];

/** Get all migrations sorted by version */
export function getMigrations(): Migration[] {
  return [...migrations].sort((a, b) => a.version - b.version);
}

/** Run migrations from currentVersion up to targetVersion */
export function migrateUp(
  config: ScreenConfiguration,
  targetVersion?: number,
): { config: ScreenConfiguration; migrationsRun: string[] } {
  const all = getMigrations();
  const currentVersion = config.version ?? 1;
  const target = targetVersion ?? (all.length > 0 ? all[all.length - 1].version : 1);

  const migrationsRun: string[] = [];
  let result = structuredClone(config);

  for (const migration of all) {
    if (migration.version > currentVersion && migration.version <= target) {
      result = migration.up(result);
      result.version = migration.version;
      migrationsRun.push(`v${migration.version}: ${migration.description}`);
    }
  }

  return { config: result, migrationsRun };
}

/** Run migrations from currentVersion down to targetVersion */
export function migrateDown(
  config: ScreenConfiguration,
  targetVersion: number,
): { config: ScreenConfiguration; migrationsRun: string[] } {
  const all = getMigrations().reverse(); // Process in reverse order
  const currentVersion = config.version ?? 1;

  const migrationsRun: string[] = [];
  let result = structuredClone(config);

  for (const migration of all) {
    if (migration.version <= currentVersion && migration.version > targetVersion) {
      result = migration.down(result);
      migrationsRun.push(`v${migration.version} (rollback): ${migration.description}`);
    }
  }

  result.version = targetVersion;
  return { config: result, migrationsRun };
}

/** Get the latest schema version */
export function getLatestSchemaVersion(): number {
  const all = getMigrations();
  return all.length > 0 ? all[all.length - 1].version : 1;
}
