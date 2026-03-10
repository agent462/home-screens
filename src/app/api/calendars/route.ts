import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getAuthenticatedClient } from '@/lib/google-auth';
import { requireSession } from '@/lib/auth';
import { errorResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireSession(request);
    const auth = await getAuthenticatedClient();
    if (!auth) {
      return NextResponse.json({ error: 'Not authenticated with Google' }, { status: 401 });
    }

    const calendar = google.calendar({ version: 'v3', auth });
    const res = await calendar.calendarList.list();
    const items = res.data.items ?? [];

    const calendars = items.map((cal) => ({
      id: cal.id ?? '',
      summary: cal.summary ?? '(Untitled)',
      backgroundColor: cal.backgroundColor ?? '#3b82f6',
      primary: cal.primary ?? false,
    }));

    return NextResponse.json(calendars);
  } catch (error) {
    if (error instanceof Response) return error;
    return errorResponse(error, 'Failed to list calendars');
  }
}
