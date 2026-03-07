import { NextRequest, NextResponse } from 'next/server';
import { handleCallback } from '@/lib/google-auth';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');

  if (error) {
    const base = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${base}/editor?google_auth=error&message=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });
  }

  try {
    await handleCallback(code);
    const base = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${base}/editor?google_auth=success`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Auth failed';
    const base = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${base}/editor?google_auth=error&message=${encodeURIComponent(message)}`);
  }
}
