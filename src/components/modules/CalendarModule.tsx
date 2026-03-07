'use client';

import { format, isSameDay, startOfDay, addDays, differenceInMinutes } from 'date-fns';
import type { CalendarConfig, ModuleStyle } from '@/types/config';
import ModuleWrapper from './ModuleWrapper';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  allDay?: boolean;
  calendarColor?: string;
}

interface CalendarModuleProps {
  config: CalendarConfig;
  style: ModuleStyle;
  events?: CalendarEvent[];
}

function formatDuration(start: Date, end: Date): string {
  const mins = differenceInMinutes(end, start);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

function EventCard({ event, textColor, showTime, showLocation }: { event: CalendarEvent; textColor: string; showTime: boolean; showLocation: boolean }) {
  const start = new Date(event.start);
  const end = new Date(event.end);
  const isAllDay = event.allDay || (!event.start.includes('T'));

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

export default function CalendarModule({ config, style, events }: CalendarModuleProps) {
  const allEvents = events ?? [];
  const daysToShow = config.daysToShow ?? 3;
  const showTime = config.showTime !== false;
  const showLocation = config.showLocation !== false;
  const today = startOfDay(new Date());

  // Build day columns
  const days = Array.from({ length: daysToShow }, (_, i) => {
    const date = addDays(today, i);
    const dayEvents = allEvents.filter((ev) => {
      const evStart = new Date(ev.start);
      // For all-day events spanning multiple days, show on each day
      if (ev.allDay || !ev.start.includes('T')) {
        const evEnd = new Date(ev.end);
        return evStart <= addDays(date, 1) && evEnd > date;
      }
      return isSameDay(evStart, date);
    });
    return { date, events: dayEvents };
  });

  return (
    <ModuleWrapper style={style}>
      <div className="flex h-full gap-3">
        {days.map(({ date, events: dayEvents }) => {
          const isToday = isSameDay(date, today);
          return (
            <div key={date.toISOString()} className="flex-1 flex flex-col min-w-0">
              {/* Day header */}
              <div className="text-center mb-2 pb-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <p
                  className="uppercase tracking-wider font-semibold"
                  style={{
                    fontSize: '0.7em',
                    opacity: isToday ? 1 : 0.5,
                  }}
                >
                  {isToday ? 'Today' : format(date, 'EEE')}
                </p>
                <p
                  className="font-bold"
                  style={{
                    fontSize: '1.3em',
                    opacity: isToday ? 1 : 0.6,
                  }}
                >
                  {format(date, 'd')}
                </p>
                <p className="opacity-40" style={{ fontSize: '0.65em' }}>
                  {format(date, 'MMM')}
                </p>
              </div>

              {/* Event list */}
              <div className="flex flex-col gap-1.5 overflow-y-auto flex-1">
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
    </ModuleWrapper>
  );
}
