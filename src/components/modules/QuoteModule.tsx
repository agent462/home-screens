'use client';

import { useState, useEffect, useCallback } from 'react';
import type { QuoteConfig, ModuleStyle } from '@/types/config';
import ModuleWrapper from './ModuleWrapper';

interface QuoteModuleProps {
  config: QuoteConfig;
  style: ModuleStyle;
}

export default function QuoteModule({ config, style }: QuoteModuleProps) {
  const [quote, setQuote] = useState<string>('');
  const [author, setAuthor] = useState<string>('');

  const fetchQuote = useCallback(async () => {
    try {
      const res = await fetch('/api/quote');
      if (res.ok) {
        const data = await res.json();
        setQuote(data.quote ?? '');
        setAuthor(data.author ?? '');
      }
    } catch {
      // silently ignore fetch errors
    }
  }, []);

  useEffect(() => {
    fetchQuote();
    const interval = setInterval(fetchQuote, config.refreshIntervalMs ?? 300000);
    return () => clearInterval(interval);
  }, [fetchQuote, config.refreshIntervalMs]);

  return (
    <ModuleWrapper style={style}>
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-center leading-relaxed italic">
          {quote || 'Loading quote...'}
        </p>
        {author && (
          <p className="mt-2 text-right w-full opacity-70" style={{ fontSize: '0.85em' }}>
            &mdash; {author}
          </p>
        )}
      </div>
    </ModuleWrapper>
  );
}
