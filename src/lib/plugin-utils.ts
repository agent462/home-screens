import { promises as fs } from 'fs';
import path from 'path';
import type { PluginManifest } from '@/types/plugins';

const PLUGINS_DIR = 'data/plugins';

export function pluginsDir(): string {
  return path.join(process.cwd(), PLUGINS_DIR);
}

/** Sanitize plugin ID to prevent directory traversal. Throws if result is empty. */
export function sanitizePluginId(pluginId: string): string {
  const safeId = pluginId.replace(/[^a-z0-9_-]/gi, '');
  if (!safeId) throw new Error('Invalid plugin ID');
  return safeId;
}

export function pluginDir(pluginId: string): string {
  return path.join(pluginsDir(), sanitizePluginId(pluginId));
}

export async function getPluginManifest(pluginId: string): Promise<PluginManifest | null> {
  try {
    const manifestPath = path.join(pluginDir(pluginId), 'manifest.json');
    const data = await fs.readFile(manifestPath, 'utf-8');
    return JSON.parse(data) as PluginManifest;
  } catch {
    return null;
  }
}
