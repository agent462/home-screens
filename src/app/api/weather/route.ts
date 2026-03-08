import { NextRequest, NextResponse } from 'next/server';
import { createWeatherProvider } from '@/lib/weather';
import { readConfig } from '@/lib/config';
import { errorResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

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
  const apiKey = ws?.apiKey || undefined;

  if (!lat || !lon) {
    return NextResponse.json(
      { error: 'Missing required query params: lat, lon' },
      { status: 400 },
    );
  }

  try {
    const weatherProvider = createWeatherProvider(provider, apiKey);

    if (type === 'forecast') {
      const forecast = await weatherProvider.getForecast(Number(lat), Number(lon), units);
      return NextResponse.json({ forecast });
    } else if (type === 'hourly') {
      const hourly = await weatherProvider.getHourly(Number(lat), Number(lon), units);
      return NextResponse.json({ hourly });
    } else {
      // Return both hourly and forecast
      const [hourly, forecast] = await Promise.all([
        weatherProvider.getHourly(Number(lat), Number(lon), units),
        weatherProvider.getForecast(Number(lat), Number(lon), units),
      ]);
      return NextResponse.json({ hourly, forecast });
    }
  } catch (error) {
    return errorResponse(error, 'Failed to fetch weather');
  }
}
