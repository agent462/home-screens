import { NextRequest, NextResponse } from 'next/server';
import { UNSPLASH_API, getUnsplashAccessKey, trackDownload } from '@/lib/unsplash';

export async function GET(request: NextRequest) {
  const accessKey = await getUnsplashAccessKey();
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
      trackDownload(downloadLocation, accessKey);
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
