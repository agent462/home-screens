import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { readFileSync } from 'fs';
import path from 'path';

/* ─── Cached auth-enabled check ──────────────── */

let authEnabledCache: { value: boolean; at: number } | null = null;
const AUTH_CACHE_TTL = 5_000; // 5 seconds

/**
 * Check if auth is enabled by reading data/auth.json.
 * Cached with a short TTL so password changes take effect quickly.
 * Uses synchronous read since Next.js proxy must return synchronously.
 */
function isAuthEnabled(): boolean {
  const now = Date.now();
  if (authEnabledCache && now - authEnabledCache.at < AUTH_CACHE_TTL) {
    return authEnabledCache.value;
  }

  let enabled = false;
  try {
    const filePath = path.join(process.cwd(), 'data', 'auth.json');
    const data = JSON.parse(readFileSync(filePath, 'utf-8'));
    enabled = data.passwordHash !== null && data.passwordHash !== undefined;
  } catch (e: unknown) {
    // ENOENT = file doesn't exist → auth disabled (default state)
    // Any other error (corrupt JSON, permission denied) → fail closed
    if (e && typeof e === 'object' && 'code' in e && (e as NodeJS.ErrnoException).code === 'ENOENT') {
      enabled = false;
    } else {
      enabled = true;
    }
  }

  authEnabledCache = { value: enabled, at: now };
  return enabled;
}

/* ─── Route classification ───────────────────── */

/**
 * Public auth routes that must always be reachable (even without a session cookie).
 */
const PUBLIC_AUTH_ROUTES = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/status',
  '/api/auth/google/callback',
];

function isPublicAuthRoute(pathname: string): boolean {
  return PUBLIC_AUTH_ROUTES.some((r) => pathname === r);
}

/**
 * Protected GET routes — editor-only or expose sensitive info.
 * All write operations (PUT/POST/DELETE) on /api/* are protected by default
 * (except public auth routes), so only GET routes need explicit listing here.
 */
const PROTECTED_GET_ROUTES = [
  '/api/secrets',
  '/api/calendars',
  '/api/backgrounds/directories',
  '/api/system/backups',
  '/api/system/changelog',
  '/api/system/version',
  '/api/system/status',
  '/api/auth/password',
  '/api/auth/sessions',
  '/api/auth/google',
  '/api/auth/google/device',
  '/api/auth/google/status',
];

function isProtectedRoute(pathname: string, method: string): boolean {
  // Editor pages — always protected
  if (pathname.startsWith('/editor')) return true;

  // API write operations — protected (except public auth routes)
  if (pathname.startsWith('/api/') && ['PUT', 'POST', 'DELETE'].includes(method)) {
    if (isPublicAuthRoute(pathname)) return false;
    return true;
  }

  // Specific GET routes that are editor-only
  if (PROTECTED_GET_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'))) {
    return true;
  }

  // Unsplash routes are editor-only
  if (pathname.startsWith('/api/unsplash')) return true;

  return false;
}

/* ─── Proxy ──────────────────────────────────── */

/**
 * Next.js 16 proxy — cookie-presence gate.
 * Only enforced when auth is enabled (passwordHash set in auth.json).
 * Real session validation happens in requireSession() inside route handlers.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // If auth is not enabled, let everything through
  if (!isAuthEnabled()) return NextResponse.next();

  if (!isProtectedRoute(pathname, method)) return NextResponse.next();

  // Cheap cookie-presence check (no signature validation here)
  const session = request.cookies.get('hs-session');
  if (session?.value) return NextResponse.next();

  // No cookie on protected route
  if (pathname.startsWith('/api/')) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Page route — redirect to login
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('from', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // Match editor pages and all API routes (skip static assets, display, login)
    '/editor/:path*',
    '/api/:path*',
  ],
};
