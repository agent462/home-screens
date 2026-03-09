import { NextRequest, NextResponse } from 'next/server';
import { requestDeviceCode, pollDeviceToken } from '@/lib/google-auth';
import { requireSession } from '@/lib/auth';

/** POST — start device flow, returns user_code + verification_url */
export async function POST(request: NextRequest) {
  try { await requireSession(request); } catch (e) { if (e instanceof Response) return e; throw e; }
  try {
    const data = await requestDeviceCode();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to start device flow';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** PUT — poll for token completion. Body: { device_code } */
export async function PUT(request: NextRequest) {
  try { await requireSession(request); } catch (e) { if (e instanceof Response) return e; throw e; }
  try {
    const { device_code } = await request.json();
    if (!device_code) {
      return NextResponse.json({ error: 'Missing device_code' }, { status: 400 });
    }
    const result = await pollDeviceToken(device_code);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Poll failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
