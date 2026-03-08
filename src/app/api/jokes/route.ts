import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

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
    return errorResponse(error, 'Failed to fetch joke');
  }
}
