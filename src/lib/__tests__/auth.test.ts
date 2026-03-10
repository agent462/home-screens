import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import {
  readAuthState,
  isAuthEnabled,
  hashPassword,
  verifyPassword,
  signSession,
  verifySession,
  setPassword,
  clearPassword,
  requireSession,
  createSessionCookie,
  buildSessionCookie,
  buildClearCookie,
  clearAuthCache,
} from '../auth';

const AUTH_PATH = path.join(process.cwd(), 'data', 'auth.json');
const AUTH_TMP = AUTH_PATH + '.tmp';

// Save and restore original auth.json around tests
let originalContent: string | null = null;

beforeEach(async () => {
  clearAuthCache();
  try {
    originalContent = await fs.readFile(AUTH_PATH, 'utf-8');
  } catch {
    originalContent = null;
  }
  // Remove auth file for clean test state
  try { await fs.unlink(AUTH_PATH); } catch { /* ok */ }
  try { await fs.unlink(AUTH_TMP); } catch { /* ok */ }
});

afterEach(async () => {
  clearAuthCache();
  try { await fs.unlink(AUTH_PATH); } catch { /* ok */ }
  try { await fs.unlink(AUTH_TMP); } catch { /* ok */ }
  if (originalContent !== null) {
    await fs.mkdir(path.dirname(AUTH_PATH), { recursive: true });
    await fs.writeFile(AUTH_PATH, originalContent, 'utf-8');
  }
});

describe('readAuthState', () => {
  it('returns disabled state when file does not exist', async () => {
    const state = await readAuthState();
    expect(state).toEqual({ passwordHash: null, salt: null, cookieSecret: null });
  });

  it('reads valid auth state', async () => {
    const data = { passwordHash: 'hash', salt: 'salt', cookieSecret: 'secret' };
    await fs.mkdir(path.dirname(AUTH_PATH), { recursive: true });
    await fs.writeFile(AUTH_PATH, JSON.stringify(data));
    const state = await readAuthState();
    expect(state).toEqual(data);
  });

  it('throws on corrupt JSON (fail closed)', async () => {
    await fs.mkdir(path.dirname(AUTH_PATH), { recursive: true });
    await fs.writeFile(AUTH_PATH, 'not json!!!');
    await expect(readAuthState()).rejects.toThrow();
  });
});

describe('isAuthEnabled', () => {
  it('returns false when no auth file exists', async () => {
    expect(await isAuthEnabled()).toBe(false);
  });

  it('returns true after setting a password', async () => {
    await setPassword('testpassword123');
    clearAuthCache();
    expect(await isAuthEnabled()).toBe(true);
  });

  it('returns false after clearing password', async () => {
    await setPassword('testpassword123');
    await clearPassword();
    clearAuthCache();
    expect(await isAuthEnabled()).toBe(false);
  });
});

describe('password hashing', () => {
  it('hashes and verifies a password correctly', async () => {
    const salt = 'a'.repeat(64);
    const hash = await hashPassword('mypassword', salt);
    expect(hash).toBeTruthy();
    expect(hash.length).toBe(128); // 64 bytes as hex
  });

  it('verifyPassword returns true for correct password', async () => {
    await setPassword('correcthorse');
    clearAuthCache();
    expect(await verifyPassword('correcthorse')).toBe(true);
  });

  it('verifyPassword returns false for wrong password', async () => {
    await setPassword('correcthorse');
    clearAuthCache();
    expect(await verifyPassword('wrongpassword')).toBe(false);
  });

  it('verifyPassword returns false when auth is disabled', async () => {
    expect(await verifyPassword('anything')).toBe(false);
  });
});

describe('session signing', () => {
  const secret = 'a'.repeat(64);

  it('signs and verifies a valid session', () => {
    const now = Math.floor(Date.now() / 1000);
    const payload = { iat: now, exp: now + 3600 };
    const cookie = signSession(payload, secret);
    expect(cookie).toContain('.');

    const result = verifySession(cookie, secret);
    expect(result).not.toBeNull();
    expect(result!.iat).toBe(now);
    expect(result!.exp).toBe(now + 3600);
  });

  it('rejects expired sessions', () => {
    const past = Math.floor(Date.now() / 1000) - 3600;
    const payload = { iat: past - 3600, exp: past };
    const cookie = signSession(payload, secret);
    expect(verifySession(cookie, secret)).toBeNull();
  });

  it('rejects tampered cookies', () => {
    const now = Math.floor(Date.now() / 1000);
    const payload = { iat: now, exp: now + 3600 };
    const cookie = signSession(payload, secret);
    const tampered = cookie.slice(0, -2) + 'XX';
    expect(verifySession(tampered, secret)).toBeNull();
  });

  it('rejects cookies signed with a different secret', () => {
    const now = Math.floor(Date.now() / 1000);
    const payload = { iat: now, exp: now + 3600 };
    const cookie = signSession(payload, secret);
    expect(verifySession(cookie, 'b'.repeat(64))).toBeNull();
  });

  it('rejects malformed cookies', () => {
    expect(verifySession('notacookie', secret)).toBeNull();
    expect(verifySession('', secret)).toBeNull();
    expect(verifySession('a.b.c', secret)).toBeNull();
  });
});

describe('setPassword / clearPassword', () => {
  it('setPassword returns a valid session cookie', async () => {
    const token = await setPassword('mypassword8');
    expect(token).toContain('.');

    const state = await readAuthState();
    expect(state.passwordHash).toBeTruthy();
    expect(state.salt).toBeTruthy();
    expect(state.cookieSecret).toBeTruthy();

    const result = verifySession(token, state.cookieSecret!);
    expect(result).not.toBeNull();
  });

  it('clearPassword wipes all auth state', async () => {
    await setPassword('mypassword8');
    await clearPassword();
    const state = await readAuthState();
    expect(state.passwordHash).toBeNull();
    expect(state.salt).toBeNull();
    expect(state.cookieSecret).toBeNull();
  });

  it('changing password invalidates old sessions', async () => {
    const oldToken = await setPassword('password1!');
    const oldState = await readAuthState();

    const newToken = await setPassword('password2!');
    const newState = await readAuthState();

    // Old cookie secret is different from new one
    expect(oldState.cookieSecret).not.toBe(newState.cookieSecret);

    // Old token is invalid with new secret
    expect(verifySession(oldToken, newState.cookieSecret!)).toBeNull();
    // New token is valid
    expect(verifySession(newToken, newState.cookieSecret!)).not.toBeNull();
  });
});

describe('requireSession', () => {
  it('is a no-op when auth is disabled', async () => {
    const request = new Request('http://localhost/api/test');
    await expect(requireSession(request)).resolves.toBeUndefined();
  });

  it('throws 401 when auth is enabled and no cookie', async () => {
    await setPassword('testpassword123');
    clearAuthCache();
    const request = new Request('http://localhost/api/test');
    try {
      await requireSession(request);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(Response);
      const res = err as Response;
      expect(res.status).toBe(401);
    }
  });

  it('passes when auth is enabled and valid cookie is present', async () => {
    const token = await setPassword('testpassword123');
    clearAuthCache();
    const request = new Request('http://localhost/api/test', {
      headers: { cookie: `hs-session=${token}` },
    });
    await expect(requireSession(request)).resolves.toBeUndefined();
  });

  it('throws 401 when cookie is invalid', async () => {
    await setPassword('testpassword123');
    clearAuthCache();
    const request = new Request('http://localhost/api/test', {
      headers: { cookie: 'hs-session=invalid.token' },
    });
    try {
      await requireSession(request);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(Response);
    }
  });
});

describe('cookie helpers', () => {
  it('buildSessionCookie includes required flags', () => {
    const request = new Request('http://localhost/api/test');
    const cookie = buildSessionCookie('token123', request);
    expect(cookie).toContain('hs-session=token123');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('Max-Age=2592000');
    expect(cookie).not.toContain('Secure');
  });

  it('buildSessionCookie includes Secure for HTTPS', () => {
    const request = new Request('https://example.com/api/test');
    const cookie = buildSessionCookie('token123', request);
    expect(cookie).toContain('Secure');
  });

  it('buildClearCookie sets Max-Age=0', () => {
    const request = new Request('http://localhost/api/test');
    const cookie = buildClearCookie(request);
    expect(cookie).toContain('Max-Age=0');
  });

  it('createSessionCookie creates a valid token', async () => {
    const secret = 'a'.repeat(64);
    const token = createSessionCookie(secret);
    const result = verifySession(token, secret);
    expect(result).not.toBeNull();
    expect(result!.exp - result!.iat).toBe(30 * 24 * 60 * 60);
  });
});
