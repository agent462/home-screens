import { NextResponse } from 'next/server';
import { getInstalledPlugins, getPluginHash } from '@/lib/plugins';
import { errorResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const installed = await getInstalledPlugins();
    const pluginHash = await getPluginHash();
    return NextResponse.json({ ...installed, pluginHash });
  } catch (error) {
    return errorResponse(error, 'Failed to read installed plugins');
  }
}
