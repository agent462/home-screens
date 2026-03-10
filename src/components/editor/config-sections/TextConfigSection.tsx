'use client';

import { useModuleConfig } from '@/hooks/useModuleConfig';
import { INPUT_CLASS } from '@/components/editor/PropertyPanel';
import type { ModuleInstance } from '@/types/config';

export function TextConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { config: c, set } = useModuleConfig<{ content?: string; alignment?: string }>(mod, screenId);

  return (
    <>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Content</span>
        <textarea
          value={(c.content as string) || ''}
          onChange={(e) => set({ content: e.target.value })}
          rows={3}
          className={`${INPUT_CLASS} resize-none`}
        />
      </label>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Alignment</span>
        <select
          value={(c.alignment as string) || 'center'}
          onChange={(e) => set({ alignment: e.target.value })}
          className={INPUT_CLASS}
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </label>
    </>
  );
}
