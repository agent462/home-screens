import { NextResponse } from 'next/server';
import { fetchRegistry } from '@/lib/plugins';
import { errorResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const registry = await fetchRegistry();
    return NextResponse.json(registry);
  } catch (error) {
    return errorResponse(error, 'Failed to fetch plugin registry');
  }
}
