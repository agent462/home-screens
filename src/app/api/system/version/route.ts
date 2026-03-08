import { NextRequest, NextResponse } from 'next/server';
import { getVersionInfo, getVersionTags, fetchRemoteTags } from '@/lib/version';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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
}
