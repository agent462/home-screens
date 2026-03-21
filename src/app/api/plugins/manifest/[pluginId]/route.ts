import { NextRequest, NextResponse } from 'next/server';
import { getPluginManifest } from '@/lib/plugins';
import { errorResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ pluginId: string }> },
) {
  try {
    const { pluginId } = await params;
    const manifest = await getPluginManifest(pluginId);
    if (!manifest) {
      return NextResponse.json({ error: 'Plugin not found' }, { status: 404 });
    }
    return NextResponse.json(manifest);
  } catch (error) {
    return errorResponse(error, 'Failed to read plugin manifest');
  }
}
