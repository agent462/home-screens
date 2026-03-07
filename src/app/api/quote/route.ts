import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://zenquotes.io/api/random');
    if (!res.ok) return NextResponse.json({ error: 'Failed to fetch quote' }, { status: 502 });
    const data = await res.json();
    const item = data[0];
    return NextResponse.json({ quote: item.q, author: item.a });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch quote';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
