'use client';

import Toggle from '@/components/ui/Toggle';
import Slider from '@/components/ui/Slider';
import { useModuleConfig } from '@/hooks/useModuleConfig';
import type { ModuleInstance } from '@/types/config';

export function FlagStatusConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { config: c, set } = useModuleConfig<{ showReason?: boolean; refreshIntervalMs?: number }>(mod, screenId);
  const intervalMin = Math.round((c.refreshIntervalMs ?? 1_800_000) / 60_000);

  return (
    <>
      <Toggle label="Show Reason" checked={c.showReason !== false} onChange={(v) => set({ showReason: v })} />
      <Slider
        label="Refresh Interval"
        value={intervalMin}
        min={30}
        max={120}
        step={5}
        displayValue={`${intervalMin} min`}
        onChange={(v) => set({ refreshIntervalMs: v * 60_000 })}
      />
    </>
  );
}
