import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, createTTLCache, fetchWithTimeout } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

/** @internal exported for test cleanup */
export const cache = createTTLCache<unknown>(30 * 1000); // 30 seconds

export async function GET(request: NextRequest) {
  try {
    const idsParam = request.nextUrl.searchParams.get('ids') || 'bitcoin,ethereum';
    const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean).join(',');

    const cached = cache.get(ids);
    if (cached) return NextResponse.json(cached);

    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=usd&include_24hr_change=true`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return NextResponse.json({ error: 'Failed to fetch crypto prices' }, { status: 502 });

    const data = await res.json();

    const prices = Object.entries(data).map(([id, values]) => {
      const v = values as { usd: number; usd_24h_change: number };
      return {
        id,
        name: id.charAt(0).toUpperCase() + id.slice(1),
        price: v.usd,
        change24h: Math.round((v.usd_24h_change ?? 0) * 100) / 100,
      };
    });

    const result = { prices };
    cache.set(ids, result);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error, 'Failed to fetch crypto prices');
  }
}
