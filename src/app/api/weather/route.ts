import { NextRequest, NextResponse } from 'next/server';
import { createWeatherProvider } from '@/lib/weather';
import { readConfig } from '@/lib/config';
import { getSecret } from '@/lib/secrets';
import { errorResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

// Server-side cache: avoids redundant external API calls when multiple
// modules (or page reloads) request the same provider within the TTL.
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { data: unknown; expires: number }>();

function getCached(key: string): unknown | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expires) return entry.data;
  if (entry) cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown) {
  if (cache.size > 20) {
    const now = Date.now();
    for (const [k, v] of cache) {
      if (now >= v.expires) cache.delete(k);
    }
  }
  cache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const type = searchParams.get('type') ?? 'both';

  // Read settings from config for defaults
  let config;
  try {
    config = await readConfig();
  } catch {
    // config not available
  }
  const ws = config?.settings?.weather;

  const provider = searchParams.get('provider') ?? ws?.provider ?? 'openweathermap';
  const lat = searchParams.get('lat') ?? ws?.latitude?.toString();
  const lon = searchParams.get('lon') ?? ws?.longitude?.toString();
  const units = searchParams.get('units') ?? ws?.units ?? 'imperial';

  if (!lat || !lon) {
    return NextResponse.json(
      { error: 'Missing required query params: lat, lon' },
      { status: 400 },
    );
  }

  const cacheKey = `${provider}:${lat}:${lon}:${units}:${type}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  const apiKey = await getSecret(provider === 'weatherapi' ? 'weatherapi_key' : 'openweathermap_key') ?? undefined;

  try {
    const weatherProvider = createWeatherProvider(provider, apiKey);
    let result: unknown;

    if (type === 'forecast') {
      const forecast = await weatherProvider.getForecast(Number(lat), Number(lon), units);
      result = { forecast };
    } else if (type === 'hourly') {
      const hourly = await weatherProvider.getHourly(Number(lat), Number(lon), units);
      result = { hourly };
    } else {
      const [hourly, forecast] = await Promise.all([
        weatherProvider.getHourly(Number(lat), Number(lon), units),
        weatherProvider.getForecast(Number(lat), Number(lon), units),
      ]);
      result = { hourly, forecast };
    }

    setCache(cacheKey, result);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error, 'Failed to fetch weather');
  }
}
