import { NextRequest, NextResponse } from 'next/server';
import { parseItems } from '@/lib/rss';
import { errorResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

const DEFAULT_FEED = 'https://feeds.bbci.co.uk/news/rss.xml';

export async function GET(request: NextRequest) {
  try {
    const feed = request.nextUrl.searchParams.get('feed') || DEFAULT_FEED;

    try {
      const url = new URL(feed);
      if (!['http:', 'https:'].includes(url.protocol)) {
        return NextResponse.json({ error: 'Invalid feed URL scheme' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid feed URL' }, { status: 400 });
    }

    const res = await fetch(feed);
    if (!res.ok) return NextResponse.json({ error: 'Failed to fetch RSS feed' }, { status: 502 });

    const xml = await res.text();
    const items = parseItems(xml);

    return NextResponse.json({ items });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch news');
  }
}
