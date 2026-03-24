import { fetchWithTimeout, createTTLCache } from '@/lib/api-utils';
import type { CalendarEvent } from '@/types/config';

const NAGER_BASE = 'https://date.nager.at/api/v3';

// 30-day caches — holiday data for a given year/country is effectively immutable
const countriesCache = createTTLCache<{ countryCode: string; name: string }[]>(30 * 24 * 60 * 60 * 1000);
const holidaysCache = createTTLCache<NagerHoliday[]>(30 * 24 * 60 * 60 * 1000);

interface NagerHoliday {
  date: string;       // YYYY-MM-DD
  localName: string;
  name: string;
  countryCode: string;
  types: string[];     // 'Public' | 'Observance' | 'Optional' | etc.
}

export async function fetchAvailableCountries(): Promise<{ countryCode: string; name: string }[]> {
  const cached = countriesCache.get('countries');
  if (cached) return cached;

  const res = await fetchWithTimeout(`${NAGER_BASE}/AvailableCountries`);
  if (!res.ok) throw new Error(`Failed to fetch countries: ${res.status}`);
  const data = await res.json();
  countriesCache.set('countries', data);
  return data;
}

async function fetchHolidays(countryCode: string, year: number): Promise<NagerHoliday[]> {
  const key = `${countryCode}:${year}`;
  const cached = holidaysCache.get(key);
  if (cached) return cached;

  const res = await fetchWithTimeout(`${NAGER_BASE}/PublicHolidays/${year}/${countryCode}`);
  if (!res.ok) throw new Error(`Failed to fetch holidays: ${res.status}`);
  const data: NagerHoliday[] = await res.json();
  holidaysCache.set(key, data);
  return data;
}

const HOLIDAY_COLOR = '#10b981'; // emerald green

/**
 * Fetches public holidays for a country and converts them to CalendarEvent format.
 * Only includes holidays typed as "Public" (skips observances, optional, etc.).
 */
export async function fetchHolidayEvents(
  countryCode: string,
  timeMin: string,
  timeMax: string,
): Promise<CalendarEvent[]> {
  const minDate = timeMin.slice(0, 10);  // YYYY-MM-DD
  const maxDate = timeMax.slice(0, 10);

  // Fetch holidays for all years in the range
  const minYear = parseInt(minDate.slice(0, 4), 10);
  const maxYear = parseInt(maxDate.slice(0, 4), 10);

  const allHolidays: NagerHoliday[] = [];
  for (let year = minYear; year <= maxYear; year++) {
    const holidays = await fetchHolidays(countryCode, year);
    allHolidays.push(...holidays);
  }

  // Filter to time range and convert to CalendarEvent
  // All-day events use half-open interval [start, end), so end = start + 1 day
  return allHolidays
    .filter((h) => h.types.includes('Public') && h.date >= minDate && h.date <= maxDate)
    .map((h) => {
      const endDate = new Date(h.date + 'T00:00:00Z');
      endDate.setUTCDate(endDate.getUTCDate() + 1);
      return {
        id: `holiday-${h.countryCode}-${h.date}`,
        title: h.localName,
        start: h.date,
        end: endDate.toISOString().slice(0, 10),
        allDay: true,
        sourceId: 'holidays',
        sourceName: 'Public Holidays',
        calendarColor: HOLIDAY_COLOR,
      };
    });
}
