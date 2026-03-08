import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { readConfig } from '@/lib/config';
import { BACKGROUNDS_DIR } from '@/lib/constants';
import { getUnsplashAccessKey, trackDownload } from '@/lib/unsplash';

const CACHE_FILE = path.join(process.cwd(), 'data', 'background-cache.json');

const BGS = path.join(process.cwd(), BACKGROUNDS_DIR);

interface CacheEntry {
  path: string;
  query: string;
  fetchedAt: number;
  intervalMinutes: number;
}

type BackgroundCache = Record<string, CacheEntry>;

async function readCache(): Promise<BackgroundCache> {
  try {
    const data = await fs.readFile(CACHE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function writeCache(cache: BackgroundCache): Promise<void> {
  await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
  await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
}

async function fetchAndSavePhoto(query: string, accessKey: string): Promise<string | null> {
  // Fetch random photo metadata from Unsplash
  const res = await fetch(
    `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=portrait&content_filter=high`,
    { headers: { Authorization: `Client-ID ${accessKey}` } },
  );
  if (!res.ok) return null;

  const photo = await res.json();
  const imageUrl = photo.urls?.regular;
  const photoId = photo.id;
  if (!imageUrl || !photoId) return null;

  // Trigger download tracking (required by Unsplash API terms)
  const downloadLocation = photo.links?.download_location;
  if (downloadLocation) {
    trackDownload(downloadLocation, accessKey);
  }

  // Download and save locally
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) return null;

  const buffer = Buffer.from(await imgRes.arrayBuffer());
  const ext = 'jpg';
  const filename = `unsplash-${photoId}.${ext}`;
  const filePath = path.join(BGS, filename);

  await fs.mkdir(BGS, { recursive: true });
  await fs.writeFile(filePath, buffer);

  return `/api/backgrounds/serve?file=${encodeURIComponent(filename)}`;
}

/**
 * GET /api/backgrounds/rotate?screenId=X
 *
 * Returns the current rotating background for a screen, fetching a new one
 * from Unsplash only when the configured interval has elapsed.
 *
 * Response: { path: string, fresh: boolean } or { path: null }
 */
export async function GET(request: NextRequest) {
  const screenId = request.nextUrl.searchParams.get('screenId');
  if (!screenId) {
    return NextResponse.json({ error: 'screenId required' }, { status: 400 });
  }

  // Read config to get this screen's rotation settings
  const config = await readConfig();
  const screen = config.screens.find((s) => s.id === screenId);
  if (!screen) {
    return NextResponse.json({ path: null });
  }

  const rotation = screen.backgroundRotation;
  if (!rotation?.enabled || !rotation.query) {
    return NextResponse.json({ path: screen.backgroundImage || null });
  }

  const cache = await readCache();
  const entry = cache[screenId];
  const intervalMs = (rotation.intervalMinutes || 60) * 60 * 1000;
  const now = Date.now();

  // Check if cached entry is still fresh
  if (
    entry &&
    entry.query === rotation.query &&
    entry.intervalMinutes === rotation.intervalMinutes &&
    now - entry.fetchedAt < intervalMs
  ) {
    return NextResponse.json({ path: entry.path, fresh: false });
  }

  // Need to fetch a new background
  const accessKey = await getUnsplashAccessKey();
  if (!accessKey) {
    // No API key — return cached or static fallback
    return NextResponse.json({ path: entry?.path || screen.backgroundImage || null });
  }

  try {
    const newPath = await fetchAndSavePhoto(rotation.query, accessKey);
    if (newPath) {
      cache[screenId] = {
        path: newPath,
        query: rotation.query,
        fetchedAt: now,
        intervalMinutes: rotation.intervalMinutes || 60,
      };
      await writeCache(cache);
      return NextResponse.json({ path: newPath, fresh: true });
    }
  } catch {
    // Fall through to return cached/fallback
  }

  return NextResponse.json({ path: entry?.path || screen.backgroundImage || null });
}
