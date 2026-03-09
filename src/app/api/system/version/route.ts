import { NextRequest, NextResponse } from 'next/server';
import { getVersionInfo, getVersionTags, fetchRemoteTags } from '@/lib/version';
import { requireSession } from '@/lib/auth';
import { errorResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireSession(request);
    const forceCheck = request.nextUrl.searchParams.get('check') === 'true';

    if (forceCheck) {
      await fetchRemoteTags(true);
    }

    const [info, tags] = await Promise.all([
      getVersionInfo(),
      getVersionTags(),
    ]);

    return NextResponse.json({
      ...info,
      tags: tags.slice(0, 20), // Last 20 versions
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return errorResponse(error, 'Failed to get version info');
  }
}
