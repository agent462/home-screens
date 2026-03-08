import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch('https://zenquotes.io/api/random');
    if (!res.ok) return NextResponse.json({ error: 'Failed to fetch quote' }, { status: 502 });
    const data = await res.json();
    const item = data[0];
    return NextResponse.json({ quote: item.q, author: item.a });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch quote');
  }
}
