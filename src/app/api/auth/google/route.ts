import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google-auth';

export async function GET(request: NextRequest) {
  try {
    const url = getAuthUrl(request.url);
    return NextResponse.redirect(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start auth';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
