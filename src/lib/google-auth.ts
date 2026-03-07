import { google } from 'googleapis';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

const TOKENS_PATH = path.join(process.cwd(), 'data', 'google-tokens.json');
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

function getRedirectUri() {
  const base = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  return `${base}/api/auth/google/callback`;
}

function createOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set');
  }
  return new google.auth.OAuth2(clientId, clientSecret, getRedirectUri());
}

export function getAuthUrl(): string {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });
}

export async function handleCallback(code: string) {
  const client = createOAuth2Client();
  const { tokens } = await client.getToken(code);
  await writeFile(TOKENS_PATH, JSON.stringify(tokens, null, 2));
  return tokens;
}

interface StoredTokens {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
  token_type?: string | null;
  scope?: string;
}

async function loadTokens(): Promise<StoredTokens | null> {
  try {
    const raw = await readFile(TOKENS_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function getAuthenticatedClient() {
  const tokens = await loadTokens();
  if (!tokens?.refresh_token) return null;

  const client = createOAuth2Client();
  client.setCredentials(tokens);

  // If token is expired or about to expire, refresh it
  if (tokens.expiry_date && tokens.expiry_date < Date.now() + 60_000) {
    const { credentials } = await client.refreshAccessToken();
    // Preserve the refresh token (Google doesn't always return it on refresh)
    const updated = { ...credentials, refresh_token: tokens.refresh_token };
    await writeFile(TOKENS_PATH, JSON.stringify(updated, null, 2));
    client.setCredentials(updated);
  }

  return client;
}

export async function isAuthenticated(): Promise<boolean> {
  const tokens = await loadTokens();
  return !!tokens?.refresh_token;
}

export async function disconnect() {
  try {
    const tokens = await loadTokens();
    if (tokens?.access_token) {
      const client = createOAuth2Client();
      client.setCredentials(tokens);
      await client.revokeToken(tokens.access_token);
    }
  } catch {
    // Best effort revocation
  }
  try {
    await writeFile(TOKENS_PATH, JSON.stringify({}));
  } catch {
    // Best effort cleanup
  }
}
