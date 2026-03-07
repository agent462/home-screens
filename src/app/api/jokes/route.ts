import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://icanhazdadjoke.com', {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch joke' }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json({ joke: data.joke });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch joke';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
