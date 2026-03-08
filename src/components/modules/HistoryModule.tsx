'use client';
import { useState, useEffect, useCallback } from 'react';
import type { HistoryConfig, ModuleStyle } from '@/types/config';
import ModuleWrapper from './ModuleWrapper';

interface HistoryModuleProps {
  config: HistoryConfig;
  style: ModuleStyle;
}

interface HistoryEvent {
  year: string;
  text: string;
}

export default function HistoryModule({ config, style }: HistoryModuleProps) {
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [index, setIndex] = useState(0);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events ?? []);
      }
    } catch { }
  }, []);

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, config.refreshIntervalMs ?? 86400000);
    return () => clearInterval(interval);
  }, [fetchHistory, config.refreshIntervalMs]);

  const rotationMs = (config.rotationIntervalSec ?? 10) * 1000;

  useEffect(() => {
    if (events.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % events.length);
    }, rotationMs);
    return () => clearInterval(interval);
  }, [events.length, rotationMs]);

  return (
    <ModuleWrapper style={style}>
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <span className="uppercase tracking-widest opacity-50" style={{ fontSize: '0.65em' }}>On This Day</span>
        {events.length > 0 ? (
          <p className="text-center leading-relaxed">
            <span className="font-bold">{events[index % events.length].year}</span>
            {' — '}
            {events[index % events.length].text}
          </p>
        ) : (
          <p className="text-center">Loading history...</p>
        )}
      </div>
    </ModuleWrapper>
  );
}
