'use client';

import type { HistoryConfig, ModuleStyle } from '@/types/config';
import { useRotatingIndex } from '@/hooks/useRotatingIndex';
import ModuleWrapper from './ModuleWrapper';
import { ModuleLoadingState } from './ModuleStates';
import { useFetchData } from '@/hooks/useFetchData';
import { historyUrl } from '@/lib/fetch-keys';

interface HistoryModuleProps {
  config: HistoryConfig;
  style: ModuleStyle;
}

interface HistoryEvent {
  year: string;
  text: string;
}

export default function HistoryModule({ config, style }: HistoryModuleProps) {
  const [data] = useFetchData<{ events: HistoryEvent[] }>(historyUrl(), config.refreshIntervalMs ?? 86400000);
  const events = data?.events ?? [];

  const rotationMs = config.rotationIntervalMs ?? 10000;
  const index = useRotatingIndex(events.length, rotationMs);

  if (!data) {
    return <ModuleLoadingState style={style} message="Loading history\u2026" />;
  }

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
          <p className="text-center opacity-50">No events found</p>
        )}
      </div>
    </ModuleWrapper>
  );
}
