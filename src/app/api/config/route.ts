import { NextRequest, NextResponse } from 'next/server';
import { readConfig, writeConfig } from '@/lib/config';
import { errorResponse } from '@/lib/api-utils';
import type { ScreenConfiguration } from '@/types/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await readConfig();
    return NextResponse.json(config);
  } catch (error) {
    return errorResponse(error, 'Failed to read config');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body || !Array.isArray(body.screens) || !body.settings) {
      return NextResponse.json(
        { error: 'Invalid config: must include screens array and settings' },
        { status: 400 },
      );
    }
    const config = body as ScreenConfiguration;
    await writeConfig(config);
    return NextResponse.json(config);
  } catch (error) {
    return errorResponse(error, 'Failed to write config');
  }
}
