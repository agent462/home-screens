'use client';

import type { NewsConfig, ModuleStyle } from '@/types/config';
import ModuleWrapper from './ModuleWrapper';
import { useFetchData } from '@/hooks/useFetchData';
import { useRotatingIndex } from '@/hooks/useRotatingIndex';

interface NewsModuleProps {
  config: NewsConfig;
  style: ModuleStyle;
}

export default function NewsModule({ config, style }: NewsModuleProps) {
  const data = useFetchData<{ items: { title: string }[] }>(
    `/api/news?feed=${encodeURIComponent(config.feedUrl)}`,
    config.refreshIntervalMs ?? 300000,
  );
  const headlines = (data?.items ?? []).map((it) => it.title);
  const index = useRotatingIndex(headlines.length, config.rotateIntervalMs ?? 10000);

  return (
    <ModuleWrapper style={style}>
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <span className="uppercase tracking-widest opacity-50" style={{ fontSize: '0.75em' }}>News</span>
        <p className="text-center leading-relaxed">
          {headlines.length > 0 ? headlines[index % headlines.length] : 'Loading news...'}
        </p>
      </div>
    </ModuleWrapper>
  );
}
