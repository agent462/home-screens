'use client';

import { useEffect, useState } from 'react';

export function useFetchData<T>(url: string, refreshMs: number): [T | null, string | null] {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) { setData(null); setError(null); return; }
    let mounted = true;

    async function fetchData() {
      try {
        const res = await fetch(url);
        if (!mounted) return;
        if (res.ok) {
          setData(await res.json());
          setError(null);
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

    fetchData();
    const interval = setInterval(fetchData, refreshMs);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [url, refreshMs]);

  return [data, error];
}
