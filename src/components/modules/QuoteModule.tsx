'use client';

import type { QuoteConfig, ModuleStyle } from '@/types/config';
import ModuleWrapper from './ModuleWrapper';
import { useFetchData } from '@/hooks/useFetchData';

interface QuoteModuleProps {
  config: QuoteConfig;
  style: ModuleStyle;
}

export default function QuoteModule({ config, style }: QuoteModuleProps) {
  const data = useFetchData<{ quote: string; author: string }>('/api/quote', config.refreshIntervalMs ?? 300000);

  return (
    <ModuleWrapper style={style}>
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-center leading-relaxed italic">
          {data?.quote || 'Loading quote...'}
        </p>
        {data?.author && (
          <p className="mt-2 text-right w-full opacity-70" style={{ fontSize: '0.85em' }}>
            &mdash; {data.author}
          </p>
        )}
      </div>
    </ModuleWrapper>
  );
}
