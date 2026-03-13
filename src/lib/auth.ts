import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

/* ─── Types ──────────────────────────────────── */

interface AuthState {
  passwordHash: string | null;
  salt: string | null;
  cookieSecret: string | null;
}

interface SessionPayload {
  iat: number;
  exp: number;
}

/* ─── Constants ──────────────────────────────── */

const AUTH_FILE = 'data/auth.json';
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds
const SCRYPT_KEYLEN = 64;

function getAuthPath(): string {
  return path.join(process.cwd(), AUTH_FILE);
}

/* ─── Auth State (fail-closed reads) ─────────── */

const DISABLED_STATE: AuthState = { passwordHash: null, salt: null, cookieSecret: null };

export async function readAuthState(): Promise<AuthState> {
  const filePath = getAuthPath();
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    // Fail closed: if file exists but is corrupt, throw (don't disable auth)
    return JSON.parse(data) as AuthState;
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
      return DISABLED_STATE;
    }
    throw err; // parse error or other I/O error → fail closed
  }
}

async function writeAuthState(state: AuthState): Promise<void> {
  const filePath = getAuthPath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmp = filePath + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(state, null, 2), 'utf-8');
  await fs.rename(tmp, filePath);
  // Clear cache so next read picks up new state
  cachedState = null;
}

/* ─── Cached reads (short TTL for requireSession hot path) ── */

let cachedState: { state: AuthState; at: number } | null = null;
const CACHE_TTL = 5_000; // 5 seconds

async function getCachedAuthState(): Promise<AuthState> {
  if (cachedState && Date.now() - cachedState.at < CACHE_TTL) {
    return cachedState.state;
  }
  const state = await readAuthState();
  cachedState = { state, at: Date.now() };
  return state;
}

export function clearAuthCache(): void {
  cachedState = null;
}

/* ─── Password hashing (scrypt) ──────────────── */

function scryptHash(password: string, salt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT_KEYLEN, (err, key) => {
      if (err) reject(err);
      else resolve(key.toString('hex'));
    });
  });
}

/** @internal */
export async function hashPassword(password: string, salt: string): Promise<string> {
  return scryptHash(password, salt);
}

export async function verifyPassword(password: string): Promise<boolean> {
  const state = await readAuthState();
  if (!state.passwordHash || !state.salt) return false;
  const hash = await scryptHash(password, state.salt);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(state.passwordHash));
}

/* ─── Signed session cookies (HMAC-SHA256) ───── */

function base64url(buf: Buffer): string {
  return buf.toString('base64url');
}

/** @internal */
export function signSession(payload: SessionPayload, cookieSecret: string): string {
  const payloadStr = base64url(Buffer.from(JSON.stringify(payload)));
  const sig = crypto.createHmac('sha256', cookieSecret).update(payloadStr).digest();
  return `${payloadStr}.${base64url(sig)}`;
}

export function verifySession(cookie: string, cookieSecret: string): SessionPayload | null {
  const parts = cookie.split('.');
  if (parts.length !== 2) return null;
  const [payloadStr, sigStr] = parts;

  // Verify HMAC signature
  const expected = crypto.createHmac('sha256', cookieSecret).update(payloadStr).digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(sigStr, 'base64url');
  } catch {
    return null;
  }
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
    return null;
  }

  // Decode payload
  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString());
  } catch {
    return null;
  }

  // Check expiry
  if (!payload.exp || Date.now() > payload.exp * 1000) return null;

  return payload;
}

/* ─── High-level helpers ─────────────────────── */

export async function isAuthEnabled(): Promise<boolean> {
  const state = await getCachedAuthState();
  return state.passwordHash !== null;
}

export function createSessionCookie(cookieSecret: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = { iat: now, exp: now + SESSION_MAX_AGE };
  return signSession(payload, cookieSecret);
}

export async function setPassword(newPassword: string): Promise<string> {
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = await scryptHash(newPassword, salt);
  const cookieSecret = crypto.randomBytes(32).toString('hex');
  await writeAuthState({ passwordHash: hash, salt, cookieSecret });
  return createSessionCookie(cookieSecret);
}

export async function clearPassword(): Promise<void> {
  await writeAuthState(DISABLED_STATE);
}

/**
 * Validates the session cookie from a request.
 * No-op when auth is disabled. Throws a 401 Response when auth is enabled
 * and the session is invalid or missing.
 */
export async function requireSession(request: Request): Promise<void> {
  const state = await getCachedAuthState();
  if (!state.passwordHash) return; // auth disabled

  // passwordHash set but cookieSecret missing = corrupt state → fail closed
  if (!state.cookieSecret) {
    throw new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Extract cookie from request headers
  const cookieHeader = request.headers.get('cookie') ?? '';
  const match = cookieHeader.match(/(?:^|;\s*)hs-session=([^;]+)/);
  const token = match?.[1];

  if (!token || !verifySession(token, state.cookieSecret)) {
    throw new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Build Set-Cookie header value for the session cookie.
 */
export function buildSessionCookie(
  token: string,
  request: Request,
  maxAge = SESSION_MAX_AGE,
): string {
  const secure = request.url.startsWith('https://');
  const parts = [
    `hs-session=${token}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${maxAge}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

/**
 * Build a Set-Cookie header that clears the session cookie.
 */
export function buildClearCookie(request: Request): string {
  return buildSessionCookie('', request, 0);
}
