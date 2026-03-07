import { NextResponse } from 'next/server';
import { readConfig, writeConfig } from '@/lib/config';
import type { ScreenConfiguration } from '@/types/config';

export async function GET() {
  try {
    const config = await readConfig();
    return NextResponse.json(config);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to read config';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
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
    const message = error instanceof Error ? error.message : 'Failed to write config';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
