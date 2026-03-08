import { NextRequest, NextResponse } from 'next/server';
import { runRollback, isUpgradeRunning } from '@/lib/upgrade';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
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

  if (!/^v?\d+\.\d+\.\d+$/.test(tag)) {
    return NextResponse.json({ error: 'Invalid tag format' }, { status: 400 });
  }

  runRollback(tag).catch(() => {
    // Error is captured in progress state
  });

  return NextResponse.json({ ok: true, message: `Rollback to ${tag} started` });
}
