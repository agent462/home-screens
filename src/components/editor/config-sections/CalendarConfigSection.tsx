'use client';

import Toggle from '@/components/ui/Toggle';
import { useModuleConfig } from '@/hooks/useModuleConfig';
import { INPUT_CLASS } from '@/components/editor/PropertyPanel';
import type { ModuleInstance } from '@/types/config';

export function CalendarConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { config: c, set } = useModuleConfig<{ viewMode?: string; daysToShow?: number; showTime?: boolean; showLocation?: boolean; maxEvents?: number; showWeekNumbers?: boolean }>(mod, screenId);
  const viewMode = c.viewMode ?? 'daily';

  return (
    <>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">View Mode</span>
        <select
          value={viewMode}
          onChange={(e) => set({ viewMode: e.target.value })}
          className={INPUT_CLASS}
        >
          <option value="daily">Daily Columns</option>
          <option value="agenda">Agenda List</option>
          <option value="week">Week Grid</option>
          <option value="month">Month Grid</option>
        </select>
      </label>
      {viewMode === 'daily' && (
        <label className="flex flex-col gap-0.5">
          <span className="text-xs text-neutral-400">Days to Show</span>
          <input
            type="number"
            min={1}
            max={14}
            value={c.daysToShow ?? 3}
            onChange={(e) => set({ daysToShow: Number(e.target.value) })}
            className={INPUT_CLASS}
          />
        </label>
      )}
      {viewMode === 'agenda' && (
        <label className="flex flex-col gap-0.5">
          <span className="text-xs text-neutral-400">Max Events</span>
          <input
            type="number"
            min={1}
            max={50}
            value={c.maxEvents ?? 20}
            onChange={(e) => set({ maxEvents: Number(e.target.value) })}
            className={INPUT_CLASS}
          />
        </label>
      )}
      {(viewMode === 'daily' || viewMode === 'agenda') && (
        <>
          <Toggle label="Show Time" checked={c.showTime !== false} onChange={(v) => set({ showTime: v })} />
          <Toggle label="Show Location" checked={!!c.showLocation} onChange={(v) => set({ showLocation: v })} />
        </>
      )}
      {(viewMode === 'week' || viewMode === 'month') && (
        <Toggle label="Show Week Numbers" checked={!!c.showWeekNumbers} onChange={(v) => set({ showWeekNumbers: v })} />
      )}
    </>
  );
}
