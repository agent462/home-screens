import { NextResponse } from 'next/server';
import { errorResponse, createTTLCache, fetchWithTimeout } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

/** @internal exported for test cleanup */
export const cache = createTTLCache<unknown>(60 * 1000); // 1 minute

export async function GET() {
  try {
    const cached = cache.get('joke');
    if (cached) return NextResponse.json(cached);

    const res = await fetchWithTimeout('https://icanhazdadjoke.com', {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch joke' }, { status: 502 });
    }
    const data = await res.json();
    const result = { joke: data.joke };
    cache.set('joke', result);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error, 'Failed to fetch joke');
  }
}
