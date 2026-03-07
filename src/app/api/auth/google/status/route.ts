import { NextResponse } from 'next/server';
import { isAuthenticated, disconnect } from '@/lib/google-auth';

export async function GET() {
  const connected = await isAuthenticated();
  return NextResponse.json({ connected });
}

export async function DELETE() {
  await disconnect();
  return NextResponse.json({ connected: false });
}
