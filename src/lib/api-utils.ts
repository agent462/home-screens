import { NextResponse } from 'next/server';
import { readConfig } from '@/lib/config';

/**
 * Standardized error response for API routes.
 * Extracts message from Error instances, falls back to provided default.
 */
export function errorResponse(
  error: unknown,
  fallbackMessage: string,
  status = 500,
): NextResponse {
  const message = error instanceof Error ? error.message : fallbackMessage;
  return NextResponse.json({ error: message }, { status });
}

/**
 * Reads lat/lon from config (with weather settings fallback),
 * allowing override from searchParams. Returns null if missing.
 */
export async function getLocationFromConfig(
  searchParams?: URLSearchParams,
  existingConfig?: Awaited<ReturnType<typeof readConfig>>,
): Promise<{ lat: string; lon: string } | null> {
  let config = existingConfig;
  if (!config) {
    try {
      config = await readConfig();
    } catch {
      // config not available
    }
  }
  const s = config?.settings;
  const ws = s?.weather;
  const lat =
    searchParams?.get('lat') ?? s?.latitude?.toString() ?? ws?.latitude?.toString();
  const lon =
    searchParams?.get('lon') ?? s?.longitude?.toString() ?? ws?.longitude?.toString();
  if (!lat || !lon) return null;
  return { lat, lon };
}

/**
 * Creates a simple in-memory cache with TTL expiration.
 */
export function createTTLCache<T>(ttlMs: number) {
  const cache = new Map<string, { data: T; timestamp: number }>();
  return {
    get(key: string): T | null {
      const entry = cache.get(key);
      if (!entry || Date.now() - entry.timestamp > ttlMs) return null;
      return entry.data;
    },
    set(key: string, data: T) {
      cache.set(key, { data, timestamp: Date.now() });
    },
  };
}
