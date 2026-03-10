'use client';

import Toggle from '@/components/ui/Toggle';
import { useModuleConfig } from '@/hooks/useModuleConfig';
import { INPUT_CLASS } from '@/components/editor/PropertyPanel';
import type { ModuleInstance } from '@/types/config';

export function ClockConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { config: c, set } = useModuleConfig<{ format24h?: boolean; showSeconds?: boolean; showDate?: boolean; dateFormat?: string; showWeekNumber?: boolean; showDayOfYear?: boolean }>(mod, screenId);

  return (
    <>
      <Toggle label="24-Hour Format" checked={!!c.format24h} onChange={(v) => set({ format24h: v })} />
      <Toggle label="Show Seconds" checked={c.showSeconds !== false} onChange={(v) => set({ showSeconds: v })} />
      <Toggle label="Show Date" checked={c.showDate !== false} onChange={(v) => set({ showDate: v })} />
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Date Format</span>
        <input
          type="text"
          value={(c.dateFormat as string) || ''}
          onChange={(e) => set({ dateFormat: e.target.value })}
          className={INPUT_CLASS}
        />
      </label>
      <Toggle label="Show Week Number" checked={!!c.showWeekNumber} onChange={(v) => set({ showWeekNumber: v })} />
      <Toggle label="Show Day of Year" checked={!!c.showDayOfYear} onChange={(v) => set({ showDayOfYear: v })} />
    </>
  );
}
