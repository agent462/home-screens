'use client';

import { useModuleConfig } from '@/hooks/useModuleConfig';
import { INPUT_CLASS } from '@/components/editor/PropertyPanel';
import type { ModuleInstance } from '@/types/config';

export function DadJokeConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { config: c, set } = useModuleConfig<{ refreshIntervalMs?: number }>(mod, screenId);

  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-xs text-neutral-400">Refresh Interval (seconds)</span>
      <input
        type="number"
        value={Math.round((c.refreshIntervalMs ?? 60000) / 1000)}
        onChange={(e) => set({ refreshIntervalMs: Number(e.target.value) * 1000 })}
        className={INPUT_CLASS}
      />
    </label>
  );
}
