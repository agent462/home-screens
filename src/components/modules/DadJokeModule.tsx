'use client';

import type { DadJokeConfig, ModuleStyle } from '@/types/config';
import ModuleWrapper from './ModuleWrapper';
import { useFetchData } from '@/hooks/useFetchData';
import { dadJokeUrl } from '@/lib/fetch-keys';

interface DadJokeModuleProps {
  config: DadJokeConfig;
  style: ModuleStyle;
}

export default function DadJokeModule({ config, style }: DadJokeModuleProps) {
  const [data] = useFetchData<{ joke: string }>(dadJokeUrl(), config.refreshIntervalMs);

  return (
    <ModuleWrapper style={style}>
      <div className="flex items-center justify-center h-full">
        <p className="text-center leading-relaxed italic">
          {data?.joke || 'Loading joke...'}
        </p>
      </div>
    </ModuleWrapper>
  );
}
