import { NextRequest, NextResponse } from 'next/server';
import { fetchCalendarEvents } from '@/lib/google-calendar';
import { readConfig } from '@/lib/config';
import { errorResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  let config;
  try {
    config = await readConfig();
  } catch (error) {
    return errorResponse(error, 'Failed to read config');
  }

  // Use query params or fall back to config
  const calendarIdsParam = searchParams.get('calendarIds');
  const calendarIds = calendarIdsParam
    ? calendarIdsParam.split(',').filter(Boolean)
    : config.settings.calendar.googleCalendarIds?.length
      ? config.settings.calendar.googleCalendarIds
      : config.settings.calendar.googleCalendarId
        ? [config.settings.calendar.googleCalendarId]
        : [];

  if (calendarIds.length === 0) {
    return NextResponse.json(
      { error: 'No calendars selected. Sign in to Google from the editor settings.' },
      { status: 400 },
    );
  }

  const daysAhead = config.settings.calendar.daysAhead ?? 7;
  const timeMin = searchParams.get('timeMin') ?? new Date().toISOString();
  const timeMax = searchParams.get('timeMax') ?? new Date(Date.now() + daysAhead * 86400000).toISOString();

  try {
    const events = await fetchCalendarEvents(calendarIds, timeMin, timeMax);
    const maxEvents = config.settings.calendar.maxEvents ?? 50;
    return NextResponse.json(events.slice(0, maxEvents));
  } catch (error) {
    return errorResponse(error, 'Failed to fetch calendar events');
  }
}
