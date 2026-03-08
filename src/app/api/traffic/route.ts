import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

interface RouteInput {
  label: string;
  origin: string;
  destination: string;
}

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCached(key: string): unknown | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: unknown) {
  cache.set(key, { data, timestamp: Date.now() });
}

async function fetchGoogle(routes: RouteInput[], apiKey: string) {
  const results = await Promise.all(
    routes.map(async (route) => {
      const body = {
        origin: { address: route.origin },
        destination: { address: route.destination },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
      };

      const res = await fetch(
        'https://routes.googleapis.com/directions/v2:computeRoutes',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'routes.duration,routes.staticDuration',
          },
          body: JSON.stringify(body),
        },
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Google Routes API error: ${res.status} ${text}`);
      }

      const data = await res.json();
      const r = data.routes?.[0];
      const staticSec = parseInt(r?.staticDuration?.replace('s', '') ?? '0', 10);
      const trafficSec = parseInt(r?.duration?.replace('s', '') ?? '0', 10);
      const durationMinutes = Math.round(staticSec / 60);
      const durationInTrafficMinutes = Math.round(trafficSec / 60);

      return {
        label: route.label,
        durationMinutes,
        durationInTrafficMinutes,
        delayMinutes: Math.max(0, durationInTrafficMinutes - durationMinutes),
      };
    }),
  );

  return results;
}

async function fetchTomTom(routes: RouteInput[], apiKey: string) {
  const results = await Promise.all(
    routes.map(async (route) => {
      const url = `https://api.tomtom.com/routing/1/calculateRoute/${encodeURIComponent(route.origin)}:${encodeURIComponent(route.destination)}/json?key=${apiKey}&traffic=true`;

      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`TomTom API error: ${res.status} ${text}`);
      }

      const data = await res.json();
      const summary = data.routes?.[0]?.summary;
      const durationSeconds = summary?.noTrafficTravelTimeInSeconds ?? 0;
      const trafficSeconds = summary?.travelTimeInSeconds ?? durationSeconds;
      const durationMinutes = Math.round(durationSeconds / 60);
      const durationInTrafficMinutes = Math.round(trafficSeconds / 60);

      return {
        label: route.label,
        durationMinutes,
        durationInTrafficMinutes,
        delayMinutes: Math.max(0, durationInTrafficMinutes - durationMinutes),
      };
    }),
  );

  return results;
}

function mockData(routes: RouteInput[]) {
  return routes.map((route) => {
    const base = 15 + Math.floor(Math.random() * 20);
    const delay = Math.floor(Math.random() * 12);
    return {
      label: route.label,
      durationMinutes: base,
      durationInTrafficMinutes: base + delay,
      delayMinutes: delay,
    };
  });
}

export async function GET(request: NextRequest) {
  try {
    const routesParam = request.nextUrl.searchParams.get('routes');
    if (!routesParam) {
      return NextResponse.json({ error: 'Missing routes parameter' }, { status: 400 });
    }

    let routes: RouteInput[];
    try {
      routes = JSON.parse(routesParam);
    } catch {
      return NextResponse.json({ error: 'Invalid routes JSON' }, { status: 400 });
    }

    if (!Array.isArray(routes) || routes.length === 0) {
      return NextResponse.json({ error: 'Routes must be a non-empty array' }, { status: 400 });
    }

    // Check cache
    const cacheKey = routesParam;
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const googleKey = process.env.GOOGLE_MAPS_API_KEY;
    const tomtomKey = process.env.TOMTOM_API_KEY;

    let result;

    if (googleKey) {
      result = { routes: await fetchGoogle(routes, googleKey) };
    } else if (tomtomKey) {
      result = { routes: await fetchTomTom(routes, tomtomKey) };
    } else {
      result = {
        routes: mockData(routes),
        mock: true,
        note: 'Set GOOGLE_MAPS_API_KEY or TOMTOM_API_KEY for real traffic data',
      };
    }

    setCache(cacheKey, result);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error, 'Failed to fetch traffic data');
  }
}
