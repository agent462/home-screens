'use client';

import Slider from '@/components/ui/Slider';
import { useModuleConfig } from '@/hooks/useModuleConfig';
import type { ModuleInstance } from '@/types/config';

export function DadJokeConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { config: c, set } = useModuleConfig<{ refreshIntervalMs?: number }>(mod, screenId);

  return (
    <Slider
      label="Refresh Interval (seconds)"
      value={(c.refreshIntervalMs ?? 60000) / 1000}
      min={30}
      max={3600}
      step={30}
      onChange={(v) => set({ refreshIntervalMs: v * 1000 })}
    />
  );
}
