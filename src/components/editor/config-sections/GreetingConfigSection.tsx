'use client';

import { useModuleConfig } from '@/hooks/useModuleConfig';
import { INPUT_CLASS } from '@/components/editor/PropertyPanel';
import type { ModuleInstance } from '@/types/config';

export function GreetingConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { config: c, set } = useModuleConfig<{ name?: string }>(mod, screenId);

  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-xs text-neutral-400">Name</span>
      <input
        type="text"
        value={(c.name as string) || 'Friend'}
        onChange={(e) => set({ name: e.target.value })}
        className={INPUT_CLASS}
      />
    </label>
  );
}
