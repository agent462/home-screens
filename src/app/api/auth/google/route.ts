import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAuthUrl } from '@/lib/google-auth';
import { requireSession } from '@/lib/auth';
import { errorResponse } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    await requireSession(request);

    // Generate a random state token to prevent OAuth CSRF
    const state = crypto.randomBytes(32).toString('hex');
    const url = await getAuthUrl(request.url, state);

    const response = NextResponse.redirect(url);

    // Store state in an HttpOnly cookie — verified in the callback
    const secure = request.url.startsWith('https://');
    const cookieParts = [
      `hs-oauth-state=${state}`,
      'HttpOnly',
      'SameSite=Lax',
      'Path=/api/auth/google/callback',
      'Max-Age=600', // 10 minutes — generous for the consent screen
    ];
    if (secure) cookieParts.push('Secure');
    response.headers.append('Set-Cookie', cookieParts.join('; '));

    return response;
  } catch (error) {
    if (error instanceof Response) return error;
    return errorResponse(error, 'Failed to start auth');
  }
}
