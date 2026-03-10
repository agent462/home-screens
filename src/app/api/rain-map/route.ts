import { NextResponse } from 'next/server';
import { errorResponse, createTTLCache } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

interface RainFrame {
  time: number;
  path: string;
}

interface RainViewerResponse {
  version: string;
  generated: number;
  host: string;
  radar: {
    past: RainFrame[];
    nowcast: RainFrame[];
  };
  satellite: {
    infrared: RainFrame[];
  };
}

const cache = createTTLCache<RainViewerResponse>(300_000); // 5 min

export async function GET() {
  try {
    const cached = cache.get('rain');
    if (cached) {
      return NextResponse.json(cached);
    }

    const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
    if (!res.ok) {
      throw new Error(`RainViewer API returned ${res.status}`);
    }

    const data: RainViewerResponse = await res.json();

    cache.set('rain', data);

    return NextResponse.json(data);
  } catch (error) {
    return errorResponse(error, 'Failed to fetch rain map data');
  }
}
