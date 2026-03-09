import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google-auth';
import { errorResponse } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const url = await getAuthUrl(request.url);
    return NextResponse.redirect(url);
  } catch (error) {
    return errorResponse(error, 'Failed to start auth');
  }
}
