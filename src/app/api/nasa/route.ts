import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import sharp from 'sharp';
import { BACKGROUNDS_DIR } from '@/lib/constants';
import { NASA_APOD_API, NASA_IMAGE_API, getNasaApiKey } from '@/lib/nasa';
import { requireSession } from '@/lib/auth';
import { errorResponse, fetchWithTimeout } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

const BGS = path.join(process.cwd(), BACKGROUNDS_DIR);

/**
 * GET /api/nasa?type=search&query=nebula&page=1
 * GET /api/nasa?type=apod&count=12
 *
 * type=search  — NASA Image and Video Library (no API key needed)
 * type=apod    — Astronomy Picture of the Day (uses NASA API key)
 */
export async function GET(request: NextRequest) {
  try {
    await requireSession(request);
    const { searchParams } = request.nextUrl;
    const type = searchParams.get('type') || 'search';

    if (type === 'apod') {
      return handleApod(searchParams);
    }
    return handleSearch(searchParams);
  } catch (error) {
    if (error instanceof Response) return error;
    return errorResponse(error, 'Failed to fetch NASA images');
  }
}

/**
 * Reject URLs that point at private/internal networks (SSRF prevention).
 * APOD images come from many CDNs (apod.nasa.gov, stsci-opo.org,
 * cdn.spacetelescope.org, jpl.nasa.gov, etc.) so a host allowlist
 * is impractical. Instead we block the actual risk: internal network access.
 */
function isSafeExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    const host = parsed.hostname;
    // Block private/reserved IPs and localhost
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '[::1]' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('169.254.') ||
      host.startsWith('0.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * POST /api/nasa — download a NASA image and save it locally as a background
 */
export async function POST(request: NextRequest) {
  try {
    await requireSession(request);
    const body = await request.json();
    const { imageUrl, filename } = body as { imageUrl?: string; filename?: string };

    if (!imageUrl) {
      return NextResponse.json({ error: 'Missing imageUrl' }, { status: 400 });
    }

    if (!isSafeExternalUrl(imageUrl)) {
      return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 });
    }

    const res = await fetchWithTimeout(imageUrl, { timeout: 60_000 });
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);

    const contentType = res.headers.get('content-type') ?? '';
    // Some NASA CDNs serve images as application/octet-stream, so also
    // accept based on file extension when content-type is ambiguous
    const hasImageType = contentType.startsWith('image/');
    const hasImageExt = /\.(jpe?g|png|webp|gif|tiff?)(\?|$)/i.test(imageUrl);
    if (!hasImageType && !hasImageExt) {
      return NextResponse.json({ error: 'URL did not return an image' }, { status: 400 });
    }

    let buffer: Buffer = Buffer.from(await res.arrayBuffer());

    // Convert non-web formats (TIFF, BMP, etc.) to JPEG via sharp
    const isTiff = contentType.includes('tiff') || /\.tiff?(\?|$)/i.test(imageUrl);
    if (isTiff || (!contentType.startsWith('image/jpeg') && !contentType.startsWith('image/png') && !contentType.startsWith('image/webp'))) {
      try {
        buffer = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
      } catch {
        // If sharp can't process it, try to use the raw buffer anyway
      }
    }

    const ext = contentType.includes('png') && !isTiff ? '.png' : contentType.includes('webp') && !isTiff ? '.webp' : '.jpg';
    const safeName = (filename || `nasa-${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, '_') + ext;

    await fs.mkdir(BGS, { recursive: true });
    await fs.writeFile(path.join(BGS, safeName), buffer);

    return NextResponse.json(
      { path: `/api/backgrounds/serve?file=${encodeURIComponent(safeName)}` },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Response) return error;
    return errorResponse(error, 'Failed to download NASA image');
  }
}

async function handleApod(params: URLSearchParams) {
  const apiKey = await getNasaApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'NASA API key not configured. Add it in Settings.' },
      { status: 400 },
    );
  }
  const count = params.get('count') || '12';

  const url = `${NASA_APOD_API}?api_key=${apiKey}&count=${count}&thumbs=true`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) {
    const body = await res.text();
    return NextResponse.json(
      { error: `NASA APOD API error ${res.status}: ${body}` },
      { status: res.status },
    );
  }

  const items: Array<Record<string, unknown>> = await res.json();

  // Filter to only images (skip videos) and map to our format
  const photos = items
    .filter((item) => item.media_type === 'image')
    .map((item) => ({
      id: item.date as string,
      title: item.title as string,
      description: item.explanation as string,
      date: item.date as string,
      url: item.url as string,
      hdurl: (item.hdurl || item.url) as string,
      thumb: item.url as string,
    }));

  return NextResponse.json({ photos });
}

async function handleSearch(params: URLSearchParams) {
  const query = params.get('query') || 'nebula';
  const page = params.get('page') || '1';

  const url = `${NASA_IMAGE_API}/search?q=${encodeURIComponent(query)}&media_type=image&page=${page}&page_size=12`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) {
    const body = await res.text();
    return NextResponse.json(
      { error: `NASA Image Library error ${res.status}: ${body}` },
      { status: res.status },
    );
  }

  const data = await res.json();
  const collection = data.collection;
  const items: Array<Record<string, unknown>> = collection?.items ?? [];

  const photos = items
    .filter((item) => {
      const links = item.links as Array<Record<string, string>> | undefined;
      return links && links.length > 0;
    })
    .map((item) => {
      const itemData = (item.data as Array<Record<string, unknown>>)?.[0] ?? {};
      const links = (item.links as Array<Record<string, string>>);
      const thumb = links?.[0]?.href ?? '';
      const nasaId = itemData.nasa_id as string;
      return {
        id: nasaId || (itemData.title as string) || thumb,
        title: itemData.title as string || '',
        description: itemData.description as string || '',
        date: itemData.date_created as string || '',
        thumb,
        nasaId,
      };
    });

  // NASA Image Library uses page-based pagination with total_hits
  const totalHits = collection?.metadata?.total_hits ?? 0;
  const totalPages = Math.ceil(totalHits / 12);

  return NextResponse.json({ photos, totalPages, total: totalHits });
}
