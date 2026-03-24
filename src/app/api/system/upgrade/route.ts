import { NextResponse } from 'next/server';
import { runUpgrade, isUpgradeRunning, isDeploying, cancelUpgrade } from '@/lib/upgrade';
import { withAuth, parseTagParam } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export const POST = withAuth(async (request) => {
  if (isUpgradeRunning()) {
    return NextResponse.json(
      { error: 'An upgrade is already in progress' },
      { status: 409 },
    );
  }

  const tag = await parseTagParam(request);
  if (tag instanceof NextResponse) return tag;

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
