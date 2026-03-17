import { NextRequest, NextResponse } from 'next/server';
import { readConfig, writeConfig } from '@/lib/config';
import { syncKioskConf, applyDisplaySettings } from '@/lib/kiosk';
import { requireSession } from '@/lib/auth';
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
    await requireSession(request);
    const body = await request.json();
    if (!body || !Array.isArray(body.screens) || !body.settings) {
      return NextResponse.json(
        { error: 'Invalid config: must include screens array and settings' },
        { status: 400 },
      );
    }
    const config = body as ScreenConfiguration;
    const prev = await readConfig().catch(() => null);
    await writeConfig(config);

    // Keep kiosk.conf in sync so kiosk-launcher.sh picks up changes on next boot
    syncKioskConf(config).catch((e) => console.error('[kiosk] kiosk.conf sync failed:', e));

    // Apply display rotation/mode immediately via wlr-randr (no reboot needed).
    // Only attempt when display settings actually changed.
    const displayChanged = !prev
      || prev.settings.displayTransform !== config.settings.displayTransform
      || prev.settings.displayWidth !== config.settings.displayWidth
      || prev.settings.displayHeight !== config.settings.displayHeight;
    if (displayChanged) {
      applyDisplaySettings(config).catch(() => {});
    }

    return NextResponse.json(config);
  } catch (error) {
    if (error instanceof Response) return error;
    return errorResponse(error, 'Failed to write config');
  }
}
