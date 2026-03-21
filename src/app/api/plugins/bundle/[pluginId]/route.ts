import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { getPluginBundlePath } from '@/lib/plugins';
import { errorResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ pluginId: string }> },
) {
  try {
    const { pluginId } = await params;
    const bundlePath = getPluginBundlePath(pluginId);
    const content = await fs.readFile(bundlePath, 'utf-8');
    return new NextResponse(content, {
      headers: { 'Content-Type': 'application/javascript' },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json({ error: 'Bundle not found' }, { status: 404 });
    }
    return errorResponse(error, 'Failed to serve plugin bundle');
  }
}
