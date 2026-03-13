'use client';

import Slider from '@/components/ui/Slider';
import { useModuleConfig } from '@/hooks/useModuleConfig';
import type { ModuleInstance } from '@/types/config';

export function HistoryConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { config: c, set } = useModuleConfig<{ refreshIntervalMs?: number; rotationIntervalMs?: number }>(mod, screenId);

  return (
    <>
      <Slider
        label="Cycle Events (seconds)"
        value={(c.rotationIntervalMs ?? 10000) / 1000}
        min={5}
        max={120}
        step={5}
        onChange={(v) => set({ rotationIntervalMs: v * 1000 })}
      />
      <Slider
        label="Reload Data (minutes)"
        value={(c.refreshIntervalMs ?? 86400000) / 60000}
        min={5}
        max={1440}
        step={5}
        onChange={(v) => set({ refreshIntervalMs: v * 60000 })}
      />
    </>
  );
}
