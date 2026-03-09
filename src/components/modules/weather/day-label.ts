import { format, isToday, isTomorrow } from 'date-fns';

export function dayLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tmrw';
  return format(date, 'EEE');
}
