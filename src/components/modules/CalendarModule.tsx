'use client';

import { format, isSameDay, startOfDay, addDays, differenceInMinutes, startOfWeek, endOfWeek, startOfMonth, endOfMonth, getWeek, isSameMonth, isToday as isDateToday } from 'date-fns';
import { createTZDate } from '@/lib/timezone';
import { parseEventDate, isEventOnDay, compareEventStarts } from '@/lib/calendar-utils';
import type { CalendarConfig, CalendarViewMode, ModuleStyle } from '@/types/config';
import ModuleWrapper from './ModuleWrapper';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  allDay?: boolean;
  calendarColor?: string;
  sourceId?: string;
  sourceName?: string;
}

interface CalendarModuleProps {
  config: CalendarConfig;
  style: ModuleStyle;
  events?: CalendarEvent[];
  timezone?: string;
}

function formatDuration(start: Date, end: Date): string {
  const mins = differenceInMinutes(end, start);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

function formatRelativeDay(date: Date, today: Date): string {
  const diffDays = Math.round((startOfDay(date).getTime() - startOfDay(today).getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  return format(date, 'EEEE, MMM d');
}

// ─── Event Card (shared across views) ───

function EventCard({ event, textColor, showTime, showLocation, compact }: {
  event: CalendarEvent;
  textColor: string;
  showTime: boolean;
  showLocation: boolean;
  compact?: boolean;
}) {
  const start = parseEventDate(event.start);
  const end = parseEventDate(event.end);
  const isAllDay = event.allDay || (!event.start.includes('T'));

  if (compact) {
    return (
      <div className="flex items-center gap-1 px-1 py-0.5 rounded truncate" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}>
        <div
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: event.calendarColor ?? '#3b82f6' }}
        />
        <span className="truncate" style={{ fontSize: '0.65em' }}>{event.title}</span>
      </div>
    );
  }

  return (
    <div
      className="flex gap-2 rounded-lg px-2.5 py-1.5"
      style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}
    >
      <div
        className="w-0.5 rounded-full shrink-0 self-stretch"
        style={{ backgroundColor: event.calendarColor ?? '#3b82f6' }}
      />
      <div className="min-w-0 flex-1">
        {showTime && (
          <p className="opacity-60" style={{ fontSize: '0.7em', color: textColor }}>
            {isAllDay ? 'All day' : (
              <>
                {format(start, 'h:mm a')} · {formatDuration(start, end)}
              </>
            )}
          </p>
        )}
        <p className="font-medium leading-tight" style={{ fontSize: '0.8em' }}>{event.title}</p>
        {showLocation && event.location && (
          <p className="opacity-40 leading-tight" style={{ fontSize: '0.65em', color: textColor }}>
            {event.location}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Daily View (original) ───

function DailyView({ events, config, style, today }: {
  events: CalendarEvent[];
  config: CalendarConfig;
  style: ModuleStyle;
  today: Date;
}) {
  const daysToShow = config.daysToShow ?? 3;
  const showTime = config.showTime !== false;
  const showLocation = config.showLocation !== false;

  const days = Array.from({ length: daysToShow }, (_, i) => {
    const date = addDays(today, i);
    const dayEvents = events.filter((ev) => isEventOnDay(ev, date));
    return { date, events: dayEvents };
  });

  return (
    <div className="flex h-full gap-3">
      {days.map(({ date, events: dayEvents }) => {
        const isToday = isSameDay(date, today);
        return (
          <div key={date.toISOString()} className="flex-1 flex flex-col min-w-0">
            <div className="text-center mb-2 pb-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <p
                className="uppercase tracking-wider font-semibold"
                style={{ fontSize: '0.7em', opacity: isToday ? 1 : 0.5 }}
              >
                {isToday ? 'Today' : format(date, 'EEE')}
              </p>
              <p
                className="font-bold"
                style={{ fontSize: '1.3em', opacity: isToday ? 1 : 0.6 }}
              >
                {format(date, 'd')}
              </p>
              <p className="opacity-40" style={{ fontSize: '0.65em' }}>
                {format(date, 'MMM')}
              </p>
            </div>
            <div className="flex flex-col gap-1.5 overflow-hidden flex-1">
              {dayEvents.length === 0 ? (
                <div
                  className="flex items-center justify-center rounded-lg px-2.5 py-3"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                >
                  <p className="opacity-30" style={{ fontSize: '0.75em' }}>No events</p>
                </div>
              ) : (
                dayEvents.map((ev) => (
                  <EventCard key={ev.id} event={ev} textColor={style.textColor} showTime={showTime} showLocation={showLocation} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Agenda View ───

function AgendaView({ events, config, style, today }: {
  events: CalendarEvent[];
  config: CalendarConfig;
  style: ModuleStyle;
  today: Date;
}) {
  const showTime = config.showTime !== false;
  const showLocation = config.showLocation !== false;
  const maxEvents = config.maxEvents ?? 20;

  // Sort events chronologically and limit
  const sorted = [...events]
    .sort((a, b) => compareEventStarts(a.start, b.start))
    .slice(0, maxEvents);

  // Group by day
  const groups: { date: Date; events: CalendarEvent[] }[] = [];
  for (const ev of sorted) {
    const evDate = startOfDay(parseEventDate(ev.start));
    const existing = groups.find((g) => isSameDay(g.date, evDate));
    if (existing) {
      existing.events.push(ev);
    } else {
      groups.push({ date: evDate, events: [ev] });
    }
  }

  if (groups.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="opacity-30" style={{ fontSize: '0.85em' }}>No upcoming events</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 overflow-hidden h-full">
      {groups.map(({ date, events: dayEvents }) => (
        <div key={date.toISOString()}>
          <div className="flex items-center gap-2 mb-1.5">
            <p
              className="font-semibold uppercase tracking-wider shrink-0"
              style={{
                fontSize: '0.7em',
                opacity: isSameDay(date, today) ? 1 : 0.6,
              }}
            >
              {formatRelativeDay(date, today)}
            </p>
            <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
          </div>
          <div className="flex flex-col gap-1.5">
            {dayEvents.map((ev) => (
              <EventCard key={ev.id} event={ev} textColor={style.textColor} showTime={showTime} showLocation={showLocation} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Week Grid View ───

function WeekView({ events, config, style, today }: {
  events: CalendarEvent[];
  config: CalendarConfig;
  style: ModuleStyle;
  today: Date;
}) {
  const showWeekNumbers = config.showWeekNumbers ?? false;
  const weekStart = startOfWeek(today, { weekStartsOn: 0 });
  const daysInWeek = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="grid gap-px mb-1" style={{
        gridTemplateColumns: showWeekNumbers ? 'auto repeat(7, 1fr)' : 'repeat(7, 1fr)',
      }}>
        {showWeekNumbers && (
          <div className="flex items-center justify-center px-1">
            <span className="opacity-30" style={{ fontSize: '0.6em' }}>Wk</span>
          </div>
        )}
        {daysInWeek.map((date) => {
          const isToday = isSameDay(date, today);
          return (
            <div key={date.toISOString()} className="text-center py-1">
              <p className="uppercase tracking-wider" style={{ fontSize: '0.6em', opacity: isToday ? 0.9 : 0.4 }}>
                {format(date, 'EEE')}
              </p>
              <div
                className="inline-flex items-center justify-center rounded-full"
                style={{
                  width: '1.8em',
                  height: '1.8em',
                  fontSize: '0.85em',
                  fontWeight: isToday ? 700 : 500,
                  backgroundColor: isToday ? 'rgba(59, 130, 246, 0.8)' : 'transparent',
                  opacity: isToday ? 1 : 0.7,
                }}
              >
                {format(date, 'd')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Event grid */}
      <div className="grid gap-px flex-1 overflow-hidden" style={{
        gridTemplateColumns: showWeekNumbers ? 'auto repeat(7, 1fr)' : 'repeat(7, 1fr)',
      }}>
        {showWeekNumbers && (
          <div className="flex items-start justify-center pt-1 px-1">
            <span className="opacity-30" style={{ fontSize: '0.6em' }}>{getWeek(weekStart)}</span>
          </div>
        )}
        {daysInWeek.map((date) => {
          const dayEvents = events.filter((ev) => isEventOnDay(ev, date));
          return (
            <div
              key={date.toISOString()}
              className="flex flex-col gap-0.5 p-0.5 overflow-hidden rounded"
              style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
            >
              {dayEvents.slice(0, 5).map((ev) => (
                <EventCard key={ev.id} event={ev} textColor={style.textColor} showTime={false} showLocation={false} compact />
              ))}
              {dayEvents.length > 5 && (
                <span className="opacity-40 text-center" style={{ fontSize: '0.55em' }}>
                  +{dayEvents.length - 5} more
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Month Grid View ───

function MonthView({ events, config, style, today }: {
  events: CalendarEvent[];
  config: CalendarConfig;
  style: ModuleStyle;
  today: Date;
}) {
  const showWeekNumbers = config.showWeekNumbers ?? false;
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  // Build grid of days
  const weeks: Date[][] = [];
  let current = calStart;
  while (current <= calEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(current);
      current = addDays(current, 1);
    }
    weeks.push(week);
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="flex flex-col h-full gap-px">
      {/* Month title */}
      <div className="text-center pb-1">
        <p className="font-semibold" style={{ fontSize: '0.85em' }}>
          {format(today, 'MMMM yyyy')}
        </p>
      </div>

      {/* Day-of-week header */}
      <div className="grid gap-px" style={{
        gridTemplateColumns: showWeekNumbers ? 'auto repeat(7, 1fr)' : 'repeat(7, 1fr)',
      }}>
        {showWeekNumbers && <div />}
        {dayNames.map((d) => (
          <div key={d} className="text-center py-0.5">
            <span className="uppercase tracking-wider opacity-40" style={{ fontSize: '0.55em' }}>{d}</span>
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div className="flex flex-col gap-px flex-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid gap-px flex-1" style={{
            gridTemplateColumns: showWeekNumbers ? 'auto repeat(7, 1fr)' : 'repeat(7, 1fr)',
          }}>
            {showWeekNumbers && (
              <div className="flex items-start justify-center pt-0.5 px-1">
                <span className="opacity-25" style={{ fontSize: '0.55em' }}>{getWeek(week[0])}</span>
              </div>
            )}
            {week.map((date) => {
              const isToday = isDateToday(date);
              const inMonth = isSameMonth(date, today);
              const dayEvents = events.filter((ev) => isEventOnDay(ev, date));

              return (
                <div
                  key={date.toISOString()}
                  className="flex flex-col p-0.5 overflow-hidden rounded"
                  style={{
                    backgroundColor: isToday ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255,255,255,0.02)',
                    opacity: inMonth ? 1 : 0.35,
                  }}
                >
                  <span
                    className="text-center leading-none mb-0.5"
                    style={{
                      fontSize: '0.65em',
                      fontWeight: isToday ? 700 : 400,
                      color: isToday ? '#60a5fa' : style.textColor,
                    }}
                  >
                    {format(date, 'd')}
                  </span>
                  <div className="flex flex-col gap-px overflow-hidden">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <EventCard key={ev.id} event={ev} textColor={style.textColor} showTime={false} showLocation={false} compact />
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="opacity-40 text-center" style={{ fontSize: '0.5em' }}>
                        +{dayEvents.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───

const VIEW_COMPONENTS: Record<CalendarViewMode, React.ComponentType<{
  events: CalendarEvent[];
  config: CalendarConfig;
  style: ModuleStyle;
  today: Date;
}>> = {
  daily: DailyView,
  agenda: AgendaView,
  week: WeekView,
  month: MonthView,
};

export default function CalendarModule({ config, style, events, timezone }: CalendarModuleProps) {
  const rawEvents = events ?? [];
  const sourceFilter = config.sourceFilter;
  const allEvents = (sourceFilter && sourceFilter.length > 0)
    ? rawEvents.filter((ev) => !ev.sourceId || sourceFilter.includes(ev.sourceId))
    : rawEvents;
  const today = startOfDay(createTZDate(timezone));
  const viewMode = config.viewMode ?? 'daily';
  const ViewComponent = VIEW_COMPONENTS[viewMode];

  return (
    <ModuleWrapper style={style}>
      <ViewComponent events={allEvents} config={config} style={style} today={today} />
    </ModuleWrapper>
  );
}
