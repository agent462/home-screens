'use client';

import type { HistoryConfig, ModuleStyle } from '@/types/config';
import { useRotatingIndex } from '@/hooks/useRotatingIndex';
import ModuleWrapper from './ModuleWrapper';
import { useFetchData } from '@/hooks/useFetchData';

interface HistoryModuleProps {
  config: HistoryConfig;
  style: ModuleStyle;
}

interface HistoryEvent {
  year: string;
  text: string;
}

export default function HistoryModule({ config, style }: HistoryModuleProps) {
  const data = useFetchData<{ events: HistoryEvent[] }>('/api/history', config.refreshIntervalMs ?? 86400000);
  const events = data?.events ?? [];

  const rotationMs = (config.rotationIntervalSec ?? 10) * 1000;
  const index = useRotatingIndex(events.length, rotationMs);

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
