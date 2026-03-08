import { NextRequest, NextResponse } from 'next/server';
import { handleCallback } from '@/lib/google-auth';

function getBase(requestUrl: string): string {
  const url = new URL(requestUrl);
  return `${url.protocol}//${url.host}`;
}

export async function GET(request: NextRequest) {
  const base = getBase(request.url);
  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${base}/editor?google_auth=error&message=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });
  }

  try {
    await handleCallback(code, request.url);
    return NextResponse.redirect(`${base}/editor?google_auth=success`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Auth failed';
    return NextResponse.redirect(`${base}/editor?google_auth=error&message=${encodeURIComponent(message)}`);
  }
}
