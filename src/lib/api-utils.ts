import { NextResponse } from 'next/server';

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
