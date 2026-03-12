import { NextRequest, NextResponse } from 'next/server';
import { getVersionInfo, getVersionTags } from '@/lib/version';
import { isUpgradeRunning } from '@/lib/upgrade';
import { requireSession } from '@/lib/auth';
import { errorResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireSession(request);
    const forceCheck = request.nextUrl.searchParams.get('check') === 'true';
    const includePrerelease = request.nextUrl.searchParams.get('channel') === 'dev';

    const [info, tags] = await Promise.all([
      getVersionInfo({ includePrerelease }),
      getVersionTags({ force: forceCheck, includePrerelease }),
    ]);

    return NextResponse.json({
      ...info,
      tags: tags.slice(0, 20), // Last 20 versions
      upgradeRunning: isUpgradeRunning(),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return errorResponse(error, 'Failed to get version info');
  }
}
