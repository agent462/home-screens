import { cachedProxyRoute } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

interface FlagWatchItem {
  start_date: string;
  end_date: string;
  reason: string;
  order_from: string;
  url: string;
}

const { GET, cache } = cachedProxyRoute({
  ttlMs: 30 * 60 * 1000, // 30 minutes
  url: 'https://flagwatch.net/api/v1/',
  transform: (data) => {
    const items = (data as { items?: FlagWatchItem[] }).items ?? [];
    // Use Eastern time — federal proclamations are issued in DC
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());

    const active = items.find((item) => {
      const start = item.start_date;
      const end = item.end_date || start; // empty end_date = single day
      return today >= start && today <= end;
    });

    if (active) {
      return {
        status: 'half-staff' as const,
        reason: active.reason,
        orderFrom: active.order_from,
        url: active.url,
      };
    }

    return { status: 'full-staff' as const };
  },
  errorMessage: 'Failed to fetch flag status',
});

/** @internal */
export { GET, cache };
