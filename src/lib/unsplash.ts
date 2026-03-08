import { readConfig } from '@/lib/config';

export const UNSPLASH_API = 'https://api.unsplash.com';

/**
 * Resolve the Unsplash access key from env or config.
 * Prefers UNSPLASH_ACCESS_KEY env var, falls back to config.settings.unsplashAccessKey.
 */
export async function getUnsplashAccessKey(): Promise<string | null> {
  if (process.env.UNSPLASH_ACCESS_KEY) return process.env.UNSPLASH_ACCESS_KEY;
  try {
    const config = await readConfig();
    return config.settings.unsplashAccessKey || null;
  } catch {
    return null;
  }
}

/**
 * Trigger Unsplash download tracking (required by Unsplash API guidelines).
 * Fires and forgets — errors are silently ignored.
 */
export function trackDownload(downloadUrl: string, accessKey: string): void {
  fetch(downloadUrl, {
    headers: { Authorization: `Client-ID ${accessKey}` },
  }).catch(() => {});
}
