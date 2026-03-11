import { NextRequest, NextResponse } from 'next/server';
import { parseItems } from '@/lib/rss';
import { errorResponse, createTTLCache, fetchWithTimeout } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

const DEFAULT_FEED = 'https://feeds.bbci.co.uk/news/rss.xml';
/** @internal exported for test cleanup */
export const cache = createTTLCache<unknown>(5 * 60 * 1000); // 5 minutes

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

    const cached = cache.get(feed);
    if (cached) return NextResponse.json(cached);

    const res = await fetchWithTimeout(feed);
    if (!res.ok) return NextResponse.json({ error: 'Failed to fetch RSS feed' }, { status: 502 });

    const xml = await res.text();
    const items = parseItems(xml);

    const result = { items };
    cache.set(feed, result);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error, 'Failed to fetch news');
  }
}
