import { NextRequest, NextResponse } from 'next/server';
import { runRebuild, isUpgradeRunning, getBuildPendingTag } from '@/lib/upgrade';
import { requireSession } from '@/lib/auth';
import { errorResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await requireSession(request);

    if (isUpgradeRunning()) {
      return NextResponse.json(
        { error: 'An upgrade is already in progress' },
        { status: 409 },
      );
    }

    const pendingTag = await getBuildPendingTag();
    if (!pendingTag) {
      return NextResponse.json(
        { error: 'No pending build found' },
        { status: 400 },
      );
    }

    // Start rebuild in background — client monitors via SSE
    runRebuild().catch(() => {
      // Error is captured in progress state
    });

    return NextResponse.json({ ok: true, message: `Rebuild for ${pendingTag} started` });
  } catch (error) {
    if (error instanceof Response) return error;
    return errorResponse(error, 'Failed to start rebuild');
  }
}
