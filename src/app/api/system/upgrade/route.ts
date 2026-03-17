import { NextResponse } from 'next/server';
import { runUpgrade, isUpgradeRunning, isDeploying, cancelUpgrade } from '@/lib/upgrade';
import { withAuth } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export const POST = withAuth(async (request) => {
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

  // Validate tag format (v1.2.3, 1.2.3, v1.2.3-rc.1, etc.)
  if (!/^v?\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/.test(tag)) {
    return NextResponse.json({ error: 'Invalid tag format' }, { status: 400 });
  }

  // Start upgrade in background — client monitors via SSE
  runUpgrade(tag).catch(() => {
    // Error is captured in progress state
  });

  return NextResponse.json({ ok: true, message: `Upgrade to ${tag} started` });
}, 'Failed to start upgrade');

export const DELETE = withAuth(async () => {
  if (!isUpgradeRunning()) {
    return NextResponse.json(
      { error: 'No upgrade is currently running' },
      { status: 404 },
    );
  }

  if (isDeploying()) {
    return NextResponse.json(
      { error: 'Cannot cancel during deploy — the update is being installed' },
      { status: 409 },
    );
  }

  const cancelled = cancelUpgrade();
  return NextResponse.json({ ok: cancelled });
}, 'Failed to cancel upgrade');
