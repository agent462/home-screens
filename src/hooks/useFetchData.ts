'use client';

import { useEffect, useState } from 'react';
import { displayCache } from '@/lib/display-cache';

export function useFetchData<T>(url: string, refreshMs: number): [T | null, string | null] {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) { setData(null); setError(null); return; }
    let mounted = true;

    async function fetchAndCache() {
      try {
        const res = await fetch(url);
        if (!mounted) return;
        if (res.ok) {
          const json = await res.json();
          setData(json);
          setError(null);
          displayCache.set(url, json, refreshMs);
        } else {
          let msg = `API error ${res.status}`;
          try {
            const body = await res.json();
            if (body.error) msg = body.error;
          } catch {
            // use default message
          }
          setError(msg);
        }
      } catch {
        if (mounted) {
          setError('Failed to fetch data');
        }
      }
    }

    // Check cache INSIDE the effect (not at render time) to avoid stale closures
    const cached = displayCache.get<T>(url);
    if (cached) {
      setData(cached.data);
      setError(null);
      if (!cached.stale) {
        // Fresh cache — skip initial fetch, just set up polling
        const interval = setInterval(fetchAndCache, refreshMs);
        return () => { mounted = false; clearInterval(interval); };
      }
      // Stale cache — show stale data, revalidate in background
    }

    // Cold start or stale: fetch now
    fetchAndCache();
    const interval = setInterval(fetchAndCache, refreshMs);
    return () => { mounted = false; clearInterval(interval); };
  }, [url, refreshMs]);

  return [data, error];
}
