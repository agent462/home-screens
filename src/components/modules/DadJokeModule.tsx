'use client';

import { useState, useEffect, useCallback } from 'react';
import type { DadJokeConfig, ModuleStyle } from '@/types/config';
import ModuleWrapper from './ModuleWrapper';

interface DadJokeModuleProps {
  config: DadJokeConfig;
  style: ModuleStyle;
}

export default function DadJokeModule({ config, style }: DadJokeModuleProps) {
  const [joke, setJoke] = useState<string>('');

  const fetchJoke = useCallback(async () => {
    try {
      const res = await fetch('/api/jokes');
      if (res.ok) {
        const data = await res.json();
        setJoke(data.joke ?? '');
      }
    } catch {
      // silently ignore fetch errors
    }
  }, []);

  useEffect(() => {
    fetchJoke();
    const interval = setInterval(fetchJoke, config.refreshIntervalMs);
    return () => clearInterval(interval);
  }, [fetchJoke, config.refreshIntervalMs]);

  return (
    <ModuleWrapper style={style}>
      <div className="flex items-center justify-center h-full">
        <p className="text-center leading-relaxed italic">
          {joke || 'Loading joke...'}
        </p>
      </div>
    </ModuleWrapper>
  );
}
