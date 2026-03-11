import { NextResponse } from 'next/server';
import { errorResponse, createTTLCache } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

/** @internal exported for test cleanup */
export const cache = createTTLCache<unknown>(60 * 60 * 1000); // 1 hour

export async function GET() {
  try {
    const cached = cache.get('quote');
    if (cached) return NextResponse.json(cached);

    const res = await fetch('https://zenquotes.io/api/random');
    if (!res.ok) return NextResponse.json({ error: 'Failed to fetch quote' }, { status: 502 });
    const data = await res.json();
    const item = data[0];
    const result = { quote: item.q, author: item.a };
    cache.set('quote', result);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error, 'Failed to fetch quote');
  }
}
