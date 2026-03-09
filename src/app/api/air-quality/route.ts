import { NextResponse } from 'next/server';
import { readConfig } from '@/lib/config';
import { getSecret } from '@/lib/secrets';
import { errorResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  let config;
  try {
    config = await readConfig();
  } catch {
    return NextResponse.json({ error: 'Config not available' }, { status: 500 });
  }

  const s = config?.settings;
  const ws = s?.weather;
  const lat = s?.latitude ?? ws?.latitude;
  const lon = s?.longitude ?? ws?.longitude;
  const apiKey = await getSecret('openweathermap_key');

  if (lat == null || lon == null) {
    return NextResponse.json(
      { error: 'Missing latitude/longitude in weather settings' },
      { status: 400 },
    );
  }

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Missing OpenWeatherMap API key — add it in Settings > Integrations' },
      { status: 400 },
    );
  }

  try {
    const [airRes, uvRes] = await Promise.all([
      fetch(
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`,
      ),
      // NOTE: /data/2.5/uvi is deprecated; may not work on newer API keys.
      // If UV returns 0, consider migrating to One Call API 3.0.
      fetch(
        `https://api.openweathermap.org/data/2.5/uvi?lat=${lat}&lon=${lon}&appid=${apiKey}`,
      ),
    ]);

    if (!airRes.ok) {
      throw new Error(`Air pollution API returned ${airRes.status}`);
    }

    const airData = await airRes.json();
    const entry = airData.list?.[0];
    if (!entry) {
      throw new Error('No air pollution data returned');
    }

    const aqi = entry.main.aqi;
    const components = entry.components;

    let uv = 0;
    if (uvRes.ok) {
      const uvData = await uvRes.json();
      uv = uvData.value ?? 0;
    }

    return NextResponse.json({
      aqi,
      pm25: components.pm2_5 ?? 0,
      pm10: components.pm10 ?? 0,
      o3: components.o3 ?? 0,
      no2: components.no2 ?? 0,
      uv,
    });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch air quality data');
  }
}
