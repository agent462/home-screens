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
 * Expired entries are cleaned up on access and when at capacity.
 */
const SERVER_CACHE_MAX_ENTRIES = 50;

export function createTTLCache<T>(ttlMs: number) {
  const cache = new Map<string, { data: T; timestamp: number }>();
  return {
    get(key: string): T | null {
      const entry = cache.get(key);
      if (!entry) return null;
      if (Date.now() - entry.timestamp > ttlMs) {
        cache.delete(key);
        return null;
      }
      return entry.data;
    },
    set(key: string, data: T) {
      if (!cache.has(key) && cache.size >= SERVER_CACHE_MAX_ENTRIES) {
        // Evict expired entries first
        const now = Date.now();
        for (const [k, v] of cache) {
          if (now - v.timestamp > ttlMs) cache.delete(k);
        }
        // If still full, drop the oldest entry (Map insertion order)
        if (cache.size >= SERVER_CACHE_MAX_ENTRIES) {
          const oldest = cache.keys().next().value;
          if (oldest !== undefined) cache.delete(oldest);
        }
      }
      cache.set(key, { data, timestamp: Date.now() });
    },
    clear() {
      cache.clear();
    },
  };
}
