import { NextResponse } from 'next/server';

export async function GET() {
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

    return NextResponse.json({ events });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch historical events';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
