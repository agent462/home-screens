'use client';
import { useState, useEffect, useCallback } from 'react';
import type { NewsConfig, ModuleStyle } from '@/types/config';
import ModuleWrapper from './ModuleWrapper';

interface NewsModuleProps {
  config: NewsConfig;
  style: ModuleStyle;
}

export default function NewsModule({ config, style }: NewsModuleProps) {
  const [headlines, setHeadlines] = useState<string[]>([]);
  const [index, setIndex] = useState(0);

  const fetchNews = useCallback(async () => {
    try {
      const res = await fetch(`/api/news?feed=${encodeURIComponent(config.feedUrl)}`);
      if (res.ok) {
        const data = await res.json();
        setHeadlines((data.items ?? []).map((it: { title: string }) => it.title));
      }
    } catch { }
  }, [config.feedUrl]);

  useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, config.refreshIntervalMs ?? 300000);
    return () => clearInterval(interval);
  }, [fetchNews, config.refreshIntervalMs]);

  useEffect(() => {
    if (headlines.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % headlines.length);
    }, config.rotateIntervalMs ?? 10000);
    return () => clearInterval(interval);
  }, [headlines.length, config.rotateIntervalMs]);

  return (
    <ModuleWrapper style={style}>
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <span className="text-xs uppercase tracking-widest opacity-50">News</span>
        <p className="text-center leading-relaxed">
          {headlines.length > 0 ? headlines[index % headlines.length] : 'Loading news...'}
        </p>
      </div>
    </ModuleWrapper>
  );
}
