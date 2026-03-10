'use client';

import Toggle from '@/components/ui/Toggle';
import Slider from '@/components/ui/Slider';
import { useModuleConfig } from '@/hooks/useModuleConfig';
import { INPUT_CLASS } from '@/components/editor/PropertyPanel';
import type { ModuleInstance } from '@/types/config';

export function MultiMonthConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { config: c, set } = useModuleConfig<{ view?: string; monthCount?: number; startDay?: string; showWeekNumbers?: boolean; highlightWeekends?: boolean; showAdjacentDays?: boolean }>(mod, screenId);

  return (
    <>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Layout</span>
        <select
          value={c.view ?? 'vertical'}
          onChange={(e) => set({ view: e.target.value })}
          className={INPUT_CLASS}
        >
          <option value="vertical">Vertical (stacked)</option>
          <option value="horizontal">Horizontal (side by side)</option>
        </select>
      </label>
      <Slider label="Months to Show" value={c.monthCount ?? 3} min={1} max={6} step={1} onChange={(v) => set({ monthCount: v })} />
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Week Starts On</span>
        <select
          value={c.startDay ?? 'sunday'}
          onChange={(e) => set({ startDay: e.target.value })}
          className={INPUT_CLASS}
        >
          <option value="sunday">Sunday</option>
          <option value="monday">Monday</option>
        </select>
      </label>
      <Toggle label="Show Week Numbers" checked={c.showWeekNumbers === true} onChange={(v) => set({ showWeekNumbers: v })} />
      <Toggle label="Highlight Weekends" checked={c.highlightWeekends !== false} onChange={(v) => set({ highlightWeekends: v })} />
      <Toggle label="Show Adjacent Days" checked={c.showAdjacentDays !== false} onChange={(v) => set({ showAdjacentDays: v })} />
    </>
  );
}
