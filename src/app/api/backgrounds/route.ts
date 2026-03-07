import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { BACKGROUNDS_DIR } from '@/lib/constants';

function getBackgroundsPath(): string {
  return path.join(process.cwd(), BACKGROUNDS_DIR);
}

export async function GET() {
  try {
    const dir = getBackgroundsPath();
    await fs.mkdir(dir, { recursive: true });
    const files = await fs.readdir(dir);
    const images = files.filter((f) =>
      /\.(jpe?g|png|webp|gif|svg|avif)$/i.test(f),
    );
    const paths = images.map((f) => `/backgrounds/${f}`);
    return NextResponse.json(paths);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list backgrounds';
    return NextResponse.json({ error: message }, { status: 500 });
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

    const dir = getBackgroundsPath();
    await fs.mkdir(dir, { recursive: true });

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = path.join(dir, safeName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    return NextResponse.json({ path: `/backgrounds/${safeName}` }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to upload background';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
