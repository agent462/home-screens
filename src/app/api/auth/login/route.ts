import { NextRequest, NextResponse } from 'next/server';
import {
  verifyPassword,
  readAuthState,
  createSessionCookie,
  buildSessionCookie,
} from '@/lib/auth';
import { errorResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

/* ─── In-memory rate limiting ────────────────── */

const failedAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function isRateLimited(ip: string): boolean {
  const entry = failedAttempts.get(ip);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) {
    failedAttempts.delete(ip);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function recordFailure(ip: string): void {
  const entry = failedAttempts.get(ip);
  if (!entry || Date.now() > entry.resetAt) {
    failedAttempts.set(ip, { count: 1, resetAt: Date.now() + WINDOW_MS });
  } else {
    entry.count++;
  }
}

function clearFailures(ip: string): void {
  failedAttempts.delete(ip);
}

/* ─── POST /api/auth/login ───────────────────── */

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many failed attempts. Try again later.' },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { password } = body;

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    const valid = await verifyPassword(password);
    if (!valid) {
      recordFailure(ip);
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    clearFailures(ip);

    const state = await readAuthState();
    if (!state.cookieSecret) {
      return NextResponse.json({ error: 'Auth state invalid' }, { status: 500 });
    }

    const token = createSessionCookie(state.cookieSecret);
    const cookie = buildSessionCookie(token, request);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookie,
      },
    });
  } catch (err) {
    return errorResponse(err, 'Login failed');
  }
}
