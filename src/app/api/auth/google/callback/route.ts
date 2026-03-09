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

  // Verify OAuth state to prevent CSRF — the state cookie was set when the
  // flow was initiated from GET /api/auth/google (which requires a session).
  const stateParam = request.nextUrl.searchParams.get('state');
  const stateCookie = request.cookies.get('hs-oauth-state')?.value;

  if (!stateParam || !stateCookie || stateParam !== stateCookie) {
    return NextResponse.redirect(
      `${base}/editor?google_auth=error&message=${encodeURIComponent('Invalid OAuth state. Please try again.')}`,
    );
  }

  try {
    await handleCallback(code, request.url);

    const response = NextResponse.redirect(`${base}/editor?google_auth=success`);
    // Clear the state cookie
    response.headers.append(
      'Set-Cookie',
      'hs-oauth-state=; HttpOnly; Path=/api/auth/google/callback; Max-Age=0',
    );
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Auth failed';
    return NextResponse.redirect(`${base}/editor?google_auth=error&message=${encodeURIComponent(message)}`);
  }
}
