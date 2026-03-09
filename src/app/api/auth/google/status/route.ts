import { NextResponse } from 'next/server';
import { isAuthenticated, disconnect, hasGoogleCredentials } from '@/lib/google-auth';

export async function GET() {
  const [connected, credentialsConfigured] = await Promise.all([
    isAuthenticated(),
    hasGoogleCredentials(),
  ]);
  return NextResponse.json({ connected, credentialsConfigured });
}

export async function DELETE() {
  await disconnect();
  return NextResponse.json({ connected: false });
}
