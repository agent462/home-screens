import { NextRequest, NextResponse } from 'next/server';
import { requestDeviceCode, pollDeviceToken } from '@/lib/google-auth';
import { requireSession } from '@/lib/auth';
import { errorResponse } from '@/lib/api-utils';

/** POST — start device flow, returns user_code + verification_url */
export async function POST(request: NextRequest) {
  try {
    await requireSession(request);
    const data = await requestDeviceCode();
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Response) return error;
    return errorResponse(error, 'Failed to start device flow');
  }
}

/** PUT — poll for token completion. Body: { device_code } */
export async function PUT(request: NextRequest) {
  try {
    await requireSession(request);
    const { device_code } = await request.json();
    if (!device_code) {
      return NextResponse.json({ error: 'Missing device_code' }, { status: 400 });
    }
    const result = await pollDeviceToken(device_code);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Response) return error;
    return errorResponse(error, 'Poll failed');
  }
}
