import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ALLOWED_HOSTS = ['a.espncdn.com'];
const TTL = 24 * 60 * 60 * 1000; // 24 hours in-memory

const cache = new Map<string, { data: ArrayBuffer; contentType: string; ts: number }>();

function imageResponse(data: ArrayBuffer, contentType: string) {
  return new Response(data, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=604800, immutable',
    },
  });
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) return new NextResponse('Missing url', { status: 400 });

  try {
    const parsed = new URL(url);
    if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
      return new NextResponse('Host not allowed', { status: 403 });
    }
  } catch {
    return new NextResponse('Invalid url', { status: 400 });
  }

  const cached = cache.get(url);
  if (cached) {
    if (Date.now() - cached.ts < TTL) {
      return imageResponse(cached.data, cached.contentType);
    }
    cache.delete(url);
  }

  try {
    const res = await fetch(url);
    if (!res.ok) return new NextResponse('Upstream fetch failed', { status: 502 });

    const data = await res.arrayBuffer();
    const contentType = res.headers.get('Content-Type') || 'image/png';

    // Evict oldest entry if cache exceeds 200 items
    if (cache.size >= 200) {
      const oldest = cache.keys().next().value;
      if (oldest) cache.delete(oldest);
    }
    cache.set(url, { data, contentType, ts: Date.now() });

    return imageResponse(data, contentType);
  } catch {
    return new NextResponse('Fetch error', { status: 502 });
  }
}
