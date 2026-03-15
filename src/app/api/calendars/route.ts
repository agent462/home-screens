import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getAuthenticatedClient, loadTokens } from '@/lib/google-auth';
import { requireSession } from '@/lib/auth';
import { errorResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireSession(request);
    const auth = await getAuthenticatedClient();
    if (!auth) {
      // Determine why auth failed so the user gets actionable info
      const tokens = await loadTokens();
      let reason = 'Not authenticated with Google';
      if (!tokens) {
        reason = 'No Google tokens found. Please sign in with Google in Settings → Calendar.';
      } else if (!tokens.refresh_token) {
        reason = 'Google did not provide a refresh token. Try revoking access at myaccount.google.com/permissions, then sign in again.';
      } else {
        reason = 'Google token refresh failed. Your authorization may have been revoked. Please sign in again.';
      }
      return NextResponse.json({ error: reason }, { status: 403 });
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
