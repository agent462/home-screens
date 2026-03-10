import { NextRequest, NextResponse } from 'next/server';
import { createWeatherProvider } from '@/lib/weather';
import { readConfig } from '@/lib/config';
import { getSecret } from '@/lib/secrets';
import { errorResponse, createTTLCache, getLocationFromConfig } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

// Server-side cache: avoids redundant external API calls when multiple
// modules (or page reloads) request the same provider within the TTL.
const cache = createTTLCache<unknown>(5 * 60 * 1000); // 5 minutes

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
  const location = await getLocationFromConfig(searchParams, config);
  const units = searchParams.get('units') ?? ws?.units ?? 'imperial';

  if (!location) {
    return NextResponse.json(
      { error: 'Missing required query params: lat, lon' },
      { status: 400 },
    );
  }

  const { lat, lon } = location;

  const cacheKey = `${provider}:${lat}:${lon}:${units}:${type}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  const secretKeyMap: Record<string, 'openweathermap_key' | 'weatherapi_key' | 'pirateweather_key'> = {
    openweathermap: 'openweathermap_key',
    weatherapi: 'weatherapi_key',
    pirateweather: 'pirateweather_key',
  };
  // NOAA requires no API key — skip the secret lookup
  const apiKey = secretKeyMap[provider]
    ? (await getSecret(secretKeyMap[provider]) ?? undefined)
    : undefined;

  try {
    const weatherProvider = createWeatherProvider(provider, apiKey);
    let result: Record<string, unknown>;

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

    // Include minutely and alerts if the provider supports them
    if (weatherProvider.getMinutely) {
      result.minutely = await weatherProvider.getMinutely(Number(lat), Number(lon), units);
    }
    if (weatherProvider.getAlerts) {
      result.alerts = await weatherProvider.getAlerts(Number(lat), Number(lon), units);
    }

    cache.set(cacheKey, result);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error, 'Failed to fetch weather');
  }
}
