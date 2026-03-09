import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { BACKGROUNDS_DIR } from '@/lib/constants';
import { errorResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

const BGS = path.join(process.cwd(), BACKGROUNDS_DIR);

/** Helper: resolve a background filename to its serve URL */
function serveUrl(filename: string) {
  return `/api/backgrounds/serve?file=${encodeURIComponent(filename)}`;
}

export async function GET() {
  try {
    const dir = BGS;
    await fs.mkdir(dir, { recursive: true });
    const files = await fs.readdir(dir);
    const images = files.filter((f) =>
      /\.(jpe?g|png|webp|gif|svg|avif)$/i.test(f),
    );
    const paths = images.map((f) => serveUrl(f));
    return NextResponse.json(paths);
  } catch (error) {
    return errorResponse(error, 'Failed to list backgrounds');
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 413 });
    }

    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/avif'];
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    const dir = BGS;
    await fs.mkdir(dir, { recursive: true });

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = path.join(dir, safeName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    return NextResponse.json({ path: serveUrl(safeName) }, { status: 201 });
  } catch (error) {
    return errorResponse(error, 'Failed to upload background');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { file } = await request.json();
    if (!file || typeof file !== 'string') {
      return NextResponse.json({ error: 'file parameter required' }, { status: 400 });
    }

    // Prevent directory traversal
    const safe = path.basename(file);
    const filePath = path.join(BGS, safe);

    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    await fs.unlink(filePath);
    return NextResponse.json({ deleted: safe });
  } catch (error) {
    return errorResponse(error, 'Failed to delete background');
  }
}
