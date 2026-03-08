import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { BACKGROUNDS_DIR } from '@/lib/constants';
import { UNSPLASH_API, getUnsplashAccessKey, trackDownload } from '@/lib/unsplash';

const BGS = path.join(process.cwd(), BACKGROUNDS_DIR);

export async function GET(request: NextRequest) {
  const accessKey = await getUnsplashAccessKey();
  if (!accessKey) {
    return NextResponse.json(
      { error: 'Unsplash API key not configured. Add it in Settings.' },
      { status: 400 },
    );
  }

  const { searchParams } = request.nextUrl;
  const query = searchParams.get('query') || 'nature landscape';
  const page = searchParams.get('page') || '1';
  const perPage = searchParams.get('per_page') || '20';
  const orientation = searchParams.get('orientation') || 'portrait';

  try {
    const url = `${UNSPLASH_API}/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&orientation=${orientation}`;
    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${accessKey}` },
    });

    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json(
        { error: `Unsplash API error ${res.status}: ${body}` },
        { status: res.status },
      );
    }

    const data = await res.json();
    const photos = (data.results ?? []).map((photo: Record<string, unknown>) => {
      const urls = photo.urls as Record<string, string>;
      const user = photo.user as Record<string, unknown>;
      return {
        id: photo.id,
        description: photo.description || photo.alt_description || '',
        thumb: urls.thumb,
        small: urls.small,
        regular: urls.regular,
        full: urls.full,
        raw: urls.raw,
        // For Unsplash attribution requirements
        authorName: user?.name ?? '',
        authorUrl: (user?.links as Record<string, string>)?.html ?? '',
        downloadUrl: (photo.links as Record<string, string>)?.download_location ?? '',
      };
    });

    return NextResponse.json({
      photos,
      totalPages: data.total_pages ?? 1,
      total: data.total ?? 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to search Unsplash';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST to download an image and save it locally as a background
export async function POST(request: NextRequest) {
  const accessKey = await getUnsplashAccessKey();

  const body = await request.json();
  const { imageUrl, downloadUrl, filename } = body as {
    imageUrl?: string;
    downloadUrl?: string;
    filename?: string;
  };

  if (!imageUrl) {
    return NextResponse.json({ error: 'Missing imageUrl' }, { status: 400 });
  }

  // Trigger Unsplash download tracking (required by their API guidelines)
  if (downloadUrl && accessKey) {
    trackDownload(downloadUrl, accessKey);
  }

  try {
    // Download the image
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);

    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') ?? 'image/jpeg';
    const ext = contentType.includes('png') ? '.png' : contentType.includes('webp') ? '.webp' : '.jpg';
    const safeName = (filename || `unsplash-${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, '_') + ext;

    // Save to backgrounds directory
    const { promises: fs } = await import('fs');
    await fs.mkdir(BGS, { recursive: true });
    await fs.writeFile(path.join(BGS, safeName), buffer);

    return NextResponse.json({ path: `/backgrounds/${safeName}` }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to download image';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
