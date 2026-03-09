import { NextRequest, NextResponse } from 'next/server';
import { runUpgrade, isUpgradeRunning } from '@/lib/upgrade';
import { errorResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    if (isUpgradeRunning()) {
      return NextResponse.json(
        { error: 'An upgrade is already in progress' },
        { status: 409 },
      );
    }

    let body: { tag?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const tag = body.tag;
    if (!tag || typeof tag !== 'string') {
      return NextResponse.json({ error: 'Missing "tag" in request body' }, { status: 400 });
    }

    // Validate tag format (v1.2.3 or 1.2.3)
    if (!/^v?\d+\.\d+\.\d+$/.test(tag)) {
      return NextResponse.json({ error: 'Invalid tag format' }, { status: 400 });
    }

    // Start upgrade in background — client monitors via SSE
    runUpgrade(tag).catch(() => {
      // Error is captured in progress state
    });

    return NextResponse.json({ ok: true, message: `Upgrade to ${tag} started` });
  } catch (error) {
    return errorResponse(error, 'Failed to start upgrade');
  }
}
