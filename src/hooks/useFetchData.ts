'use client';

import { useEffect, useState } from 'react';

export function useFetchData<T>(url: string, refreshMs: number): T | null {
  const [data, setData] = useState<T | null>(null);

  useEffect(() => {
    if (!url) { setData(null); return; }
    let mounted = true;

    async function fetchData() {
      try {
        const res = await fetch(url);
        if (res.ok && mounted) {
          setData(await res.json());
        }
      } catch {
        // silently retry on next interval
      }
    }

    fetchData();
    const interval = setInterval(fetchData, refreshMs);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [url, refreshMs]);

  return data;
}
