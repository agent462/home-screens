'use client';

import Slider from '@/components/ui/Slider';
import { useModuleConfig } from '@/hooks/useModuleConfig';
import type { ModuleInstance } from '@/types/config';

export function createRefreshOnlySection(defaultMs: number) {
  return function RefreshOnlyConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
    const { config: c, set } = useModuleConfig<{ refreshIntervalMs?: number }>(mod, screenId);

    return (
      <Slider
        label="Refresh (seconds)"
        value={(c.refreshIntervalMs ?? defaultMs) / 1000}
        min={30}
        max={3600}
        step={30}
        onChange={(v) => set({ refreshIntervalMs: v * 1000 })}
      />
    );
  };
}
