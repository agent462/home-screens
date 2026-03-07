import { NextRequest, NextResponse } from 'next/server';
import { readConfig } from '@/lib/config';

const UNSPLASH_API = 'https://api.unsplash.com';

async function getAccessKey(): Promise<string | null> {
  if (process.env.UNSPLASH_ACCESS_KEY) return process.env.UNSPLASH_ACCESS_KEY;
  try {
    const config = await readConfig();
    return config.settings.unsplashAccessKey || null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const accessKey = await getAccessKey();
  if (!accessKey) {
    return NextResponse.json({ error: 'Unsplash API key not configured' }, { status: 400 });
  }

  const query = request.nextUrl.searchParams.get('query') || 'nature landscape';
  const orientation = request.nextUrl.searchParams.get('orientation') || 'portrait';

  try {
    const url = `${UNSPLASH_API}/photos/random?query=${encodeURIComponent(query)}&orientation=${orientation}&content_filter=high`;
    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${accessKey}` },
    });

    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json({ error: `Unsplash error ${res.status}: ${body}` }, { status: res.status });
    }

    const photo = await res.json();
    const urls = photo.urls as Record<string, string>;
    const user = photo.user as Record<string, unknown>;

    // Trigger download tracking
    const downloadLocation = (photo.links as Record<string, string>)?.download_location;
    if (downloadLocation) {
      fetch(downloadLocation, {
        headers: { Authorization: `Client-ID ${accessKey}` },
      }).catch(() => {});
    }

    return NextResponse.json({
      id: photo.id,
      url: urls.regular,
      thumb: urls.thumb,
      authorName: user?.name ?? '',
      description: photo.description || photo.alt_description || '',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch random photo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
