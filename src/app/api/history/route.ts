import { NextResponse } from 'next/server';
import { errorResponse, createTTLCache, fetchWithTimeout } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

const cache = createTTLCache<Array<{ year: string; text: string }>>(24 * 60 * 60 * 1000); // 24 hours

export async function GET() {
  const today = new Date().toISOString().slice(0, 10);
  const cached = cache.get(today);
  if (cached) {
    return NextResponse.json({ events: cached });
  }

  try {
    const res = await fetchWithTimeout('https://history.muffinlabs.com/date', {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return NextResponse.json({ error: 'Failed to fetch historical events' }, { status: 502 });

    const data = await res.json();
    const allEvents: Array<{ year: string; text: string }> = data.data?.Events ?? [];
    const events = allEvents.slice(0, 10).map((e) => ({
      year: e.year,
      text: e.text,
    }));

    cache.set(today, events);
    return NextResponse.json({ events });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch historical events');
  }
}
