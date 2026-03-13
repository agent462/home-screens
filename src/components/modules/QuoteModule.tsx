'use client';

import type { QuoteConfig, ModuleStyle } from '@/types/config';
import ModuleWrapper from './ModuleWrapper';
import { ModuleLoadingState } from './ModuleStates';
import { useFetchData } from '@/hooks/useFetchData';
import { quoteUrl } from '@/lib/fetch-keys';

interface QuoteModuleProps {
  config: QuoteConfig;
  style: ModuleStyle;
}

export default function QuoteModule({ config, style }: QuoteModuleProps) {
  const [data, error] = useFetchData<{ quote: string; author: string }>(quoteUrl(), config.refreshIntervalMs ?? 300000);

  if (data === null) {
    return <ModuleLoadingState style={style} message="Loading quote…" error={error} />;
  }

  return (
    <ModuleWrapper style={style}>
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-center leading-relaxed italic">
          {data.quote}
        </p>
        {data.author && (
          <p className="mt-2 text-right w-full opacity-70" style={{ fontSize: '0.85em' }}>
            &mdash; {data.author}
          </p>
        )}
      </div>
    </ModuleWrapper>
  );
}
