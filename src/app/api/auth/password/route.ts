import { NextRequest, NextResponse } from 'next/server';
import {
  isAuthEnabled,
  verifyPassword,
  setPassword,
  clearPassword,
  requireSession,
  buildSessionCookie,
  buildClearCookie,
  clearAuthCache,
} from '@/lib/auth';
import { errorResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

const MIN_PASSWORD_LENGTH = 8;

export async function POST(request: NextRequest) {
  try {
    const authEnabled = await isAuthEnabled();

    // If auth is already enabled, require a valid session
    if (authEnabled) {
      await requireSession(request);
    }

    const body = await request.json();
    const { currentPassword, newPassword, action } = body;

    // Disable auth
    if (action === 'disable') {
      if (!authEnabled) {
        return NextResponse.json({ error: 'Auth is not enabled' }, { status: 400 });
      }
      if (!currentPassword || typeof currentPassword !== 'string') {
        return NextResponse.json({ error: 'Current password is required' }, { status: 400 });
      }
      const valid = await verifyPassword(currentPassword);
      if (!valid) {
        return NextResponse.json({ error: 'Invalid current password' }, { status: 401 });
      }
      await clearPassword();
      clearAuthCache();
      const cookie = buildClearCookie(request);
      return new Response(JSON.stringify({ success: true, authEnabled: false }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': cookie,
        },
      });
    }

    // Set or change password
    if (!newPassword || typeof newPassword !== 'string') {
      return NextResponse.json({ error: 'New password is required' }, { status: 400 });
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
        { status: 400 },
      );
    }

    // If auth is enabled, verify current password before changing
    if (authEnabled) {
      if (!currentPassword || typeof currentPassword !== 'string') {
        return NextResponse.json({ error: 'Current password is required' }, { status: 400 });
      }
      const valid = await verifyPassword(currentPassword);
      if (!valid) {
        return NextResponse.json({ error: 'Invalid current password' }, { status: 401 });
      }
    }

    const token = await setPassword(newPassword);
    clearAuthCache();
    const cookie = buildSessionCookie(token, request);

    return new Response(
      JSON.stringify({ success: true, authEnabled: true }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': cookie,
        },
      },
    );
  } catch (err) {
    // requireSession throws a Response on 401
    if (err instanceof Response) return err;
    return errorResponse(err, 'Password operation failed');
  }
}
