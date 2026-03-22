import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-utils';
import { validateManifest, registerDevPlugin } from '@/lib/plugins';
import type { PluginManifest } from '@/types/plugins';

export const dynamic = 'force-dynamic';

/**
 * Register a dev plugin on the server so the proxy can find its manifest
 * and allowedDomains. Called automatically by loadDevPlugin on the client.
 */
export async function POST(request: NextRequest) {
  try {
    const { manifest } = (await request.json()) as { manifest: PluginManifest };

    if (!manifest || !validateManifest(manifest)) {
      return NextResponse.json({ error: 'Invalid manifest' }, { status: 400 });
    }

    await registerDevPlugin(manifest);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, 'Failed to register dev plugin');
  }
}
