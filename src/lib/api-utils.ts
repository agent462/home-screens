import { NextRequest, NextResponse } from 'next/server';
import { readConfig } from '@/lib/config';
import { requireSession } from '@/lib/auth';

/**
 * Standardized error response for API routes.
 * Always returns the generic fallbackMessage to clients to avoid leaking
 * internal details (file paths, upstream API info, stack traces).
 * The real error is logged server-side for debugging.
 */
export function errorResponse(
  error: unknown,
  fallbackMessage: string,
  status = 500,
): NextResponse {
  console.error(fallbackMessage, error);
  return NextResponse.json({ error: fallbackMessage }, { status });
}

/**
 * Fetch wrapper that enforces a timeout on external API calls.
 * Prevents hung upstream services from blocking requests indefinitely.
 */
const DEFAULT_FETCH_TIMEOUT_MS = 10_000;

export function fetchWithTimeout(
  url: string | URL | Request,
  init?: RequestInit & { timeout?: number },
): Promise<Response> {
  const { timeout = DEFAULT_FETCH_TIMEOUT_MS, ...rest } = init ?? {};
  const timeoutSignal = AbortSignal.timeout(timeout);
  const signal = rest.signal
    ? AbortSignal.any([rest.signal, timeoutSignal])
    : timeoutSignal;
  return fetch(url, { ...rest, signal });
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

type TTLCache<T> = ReturnType<typeof createTTLCache<T>>;

/**
 * Validates a Todoist API token by making a lightweight request to the
 * Todoist projects endpoint. Returns `true` if the token is valid, or an
 * object with the HTTP status code if it is not.
 */
export async function validateTodoistToken(
  token: string,
): Promise<{ valid: true } | { valid: false; status: number }> {
  const res = await fetchWithTimeout('https://api.todoist.com/api/v1/projects', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { valid: false, status: res.status };
  return { valid: true };
}

/**
 * Wraps an authenticated API route handler with the standard
 * requireSession + error-handling boilerplate.
 *
 * Before:
 *   export async function GET(request: NextRequest) {
 *     try {
 *       await requireSession(request);
 *       // …handler logic…
 *     } catch (error) {
 *       if (error instanceof Response) return error;
 *       return errorResponse(error, 'Failed to …');
 *     }
 *   }
 *
 * After:
 *   export const GET = withAuth(async (request) => {
 *     // …handler logic…
 *   }, 'Failed to …');
 */
export function withAuth(
  handler: (request: NextRequest) => Promise<Response>,
  errorMsg: string,
) {
  return async (request: NextRequest): Promise<Response> => {
    try {
      await requireSession(request);
      return await handler(request);
    } catch (error) {
      if (error instanceof Response) return error;
      return errorResponse(error, errorMsg);
    }
  };
}

interface CachedProxyRouteOptions<T> {
  ttlMs: number;
  cacheKey?: (request: NextRequest) => string;
  url: string | ((request: NextRequest) => string);
  fetchInit?: RequestInit;
  transform: (data: unknown, request: NextRequest) => T;
  errorMessage: string;
}

interface CachedProxyRouteCustomOptions<T> {
  ttlMs: number;
  cacheKey?: (request: NextRequest) => string;
  execute: (request: NextRequest) => Promise<T | NextResponse>;
  errorMessage: string;
}

type CachedProxyRouteConfig<T> = CachedProxyRouteOptions<T> | CachedProxyRouteCustomOptions<T>;

function isCustomConfig<T>(config: CachedProxyRouteConfig<T>): config is CachedProxyRouteCustomOptions<T> {
  return 'execute' in config;
}

export function cachedProxyRoute<T>(config: CachedProxyRouteConfig<T>) {
  const cache = createTTLCache<T>(config.ttlMs);
  const keyFn = config.cacheKey ?? (() => '_');

  const GET = async (request: NextRequest) => {
    try {
      const key = keyFn(request);
      const cached = cache.get(key);
      if (cached) return NextResponse.json(cached);

      let result: T | NextResponse;
      if (isCustomConfig(config)) {
        result = await config.execute(request);
      } else {
        const resolvedUrl = typeof config.url === 'function' ? config.url(request) : config.url;
        const res = await fetchWithTimeout(resolvedUrl, config.fetchInit);
        if (!res.ok) {
          return NextResponse.json({ error: config.errorMessage }, { status: 502 });
        }
        const data = await res.json();
        result = config.transform(data, request);
      }

      if (result instanceof NextResponse) return result;
      cache.set(key, result);
      return NextResponse.json(result);
    } catch (error) {
      return errorResponse(error, config.errorMessage);
    }
  };

  return { GET, cache };
}
