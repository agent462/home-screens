import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

let cache: { date: string; events: Array<{ year: string; text: string }> } | null = null;

export async function GET() {
  const today = new Date().toISOString().slice(0, 10);
  if (cache && cache.date === today) {
    return NextResponse.json({ events: cache.events });
  }

  try {
    const res = await fetch('https://history.muffinlabs.com/date', {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return NextResponse.json({ error: 'Failed to fetch historical events' }, { status: 502 });

    const data = await res.json();
    const allEvents: Array<{ year: string; text: string }> = data.data?.Events ?? [];
    const events = allEvents.slice(0, 10).map((e) => ({
      year: e.year,
      text: e.text,
    }));

    cache = { date: today, events };
    return NextResponse.json({ events });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch historical events');
  }
}
