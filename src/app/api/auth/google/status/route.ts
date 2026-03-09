import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAuthenticated, disconnect, hasGoogleCredentials } from '@/lib/google-auth';
import { requireSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try { await requireSession(request); } catch (e) { if (e instanceof Response) return e; throw e; }
  const [connected, credentialsConfigured] = await Promise.all([
    isAuthenticated(),
    hasGoogleCredentials(),
  ]);
  return NextResponse.json({ connected, credentialsConfigured });
}

export async function DELETE(request: NextRequest) {
  try { await requireSession(request); } catch (e) { if (e instanceof Response) return e; throw e; }
  await disconnect();
  return NextResponse.json({ connected: false });
}
