'use client';

import type { DadJokeConfig, ModuleStyle } from '@/types/config';
import ModuleWrapper from './ModuleWrapper';
import { ModuleLoadingState } from './ModuleStates';
import { useFetchData } from '@/hooks/useFetchData';
import { dadJokeUrl } from '@/lib/fetch-keys';

interface DadJokeModuleProps {
  config: DadJokeConfig;
  style: ModuleStyle;
}

export default function DadJokeModule({ config, style }: DadJokeModuleProps) {
  const [data, error] = useFetchData<{ joke: string }>(dadJokeUrl(), config.refreshIntervalMs);

  if (data === null) {
    return <ModuleLoadingState style={style} message="Loading joke…" error={error} />;
  }

  return (
    <ModuleWrapper style={style}>
      <div className="flex items-center justify-center h-full">
        <p className="text-center leading-relaxed italic">
          {data.joke}
        </p>
      </div>
    </ModuleWrapper>
  );
}
