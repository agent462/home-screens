import { NextResponse } from 'next/server';
import { runRollback, isUpgradeRunning } from '@/lib/upgrade';
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

  runRollback(tag).catch(() => {
    // Error is captured in progress state
  });

  return NextResponse.json({ ok: true, message: `Rollback to ${tag} started` });
}, 'Rollback failed');
