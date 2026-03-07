import { NextRequest, NextResponse } from 'next/server';
import { readConfig } from '@/lib/config';

const UNSPLASH_API = 'https://api.unsplash.com';

async function getAccessKey(): Promise<string | null> {
  // Check env first, then config
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
  const accessKey = await getAccessKey();

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
    fetch(downloadUrl, {
      headers: { Authorization: `Client-ID ${accessKey}` },
    }).catch(() => {});
  }

  try {
    // Download the image
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);

    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') ?? 'image/jpeg';
    const ext = contentType.includes('png') ? '.png' : contentType.includes('webp') ? '.webp' : '.jpg';
    const safeName = (filename || `unsplash-${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, '_') + ext;

    // Save to public/backgrounds
    const { promises: fs } = await import('fs');
    const path = await import('path');
    const dir = path.join(process.cwd(), 'public/backgrounds');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, safeName), buffer);

    return NextResponse.json({ path: `/backgrounds/${safeName}` }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to download image';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
