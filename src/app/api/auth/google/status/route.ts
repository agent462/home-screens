import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, disconnect, hasGoogleCredentials } from '@/lib/google-auth';
import { requireSession } from '@/lib/auth';
import { errorResponse } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    await requireSession(request);
    const [connected, credentialsConfigured] = await Promise.all([
      isAuthenticated(),
      hasGoogleCredentials(),
    ]);
    return NextResponse.json({ connected, credentialsConfigured });
  } catch (error) {
    if (error instanceof Response) return error;
    return errorResponse(error, 'Failed to check Google auth status');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireSession(request);
    await disconnect();
    return NextResponse.json({ connected: false });
  } catch (error) {
    if (error instanceof Response) return error;
    return errorResponse(error, 'Failed to disconnect Google account');
  }
}
