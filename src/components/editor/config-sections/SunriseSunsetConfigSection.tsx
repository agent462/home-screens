'use client';

import Toggle from '@/components/ui/Toggle';
import { useModuleConfig } from '@/hooks/useModuleConfig';
import { INPUT_CLASS } from '@/components/editor/PropertyPanel';
import type { ModuleInstance, SunriseSunsetView } from '@/types/config';

const VIEWS: { value: SunriseSunsetView; label: string }[] = [
  { value: 'default', label: 'Default (Text)' },
  { value: 'arc', label: 'Sun Arc (Visual)' },
];

type SunriseSunsetConfigType = {
  view?: SunriseSunsetView;
  showDayLength?: boolean;
  showGoldenHour?: boolean;
};

export function SunriseSunsetConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { config: c, set } = useModuleConfig<SunriseSunsetConfigType>(mod, screenId);

  return (
    <>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">View</span>
        <select
          value={c.view ?? 'default'}
          onChange={(e) => set({ view: e.target.value as SunriseSunsetView })}
          className={INPUT_CLASS}
        >
          {VIEWS.map((v) => (
            <option key={v.value} value={v.value}>{v.label}</option>
          ))}
        </select>
      </label>
      <Toggle label="Show Day Length" checked={c.showDayLength !== false} onChange={(v) => set({ showDayLength: v })} />
      <Toggle label="Show Golden Hour" checked={!!c.showGoldenHour} onChange={(v) => set({ showGoldenHour: v })} />
      <p className="text-xs text-neutral-500">Uses location from global settings.</p>
    </>
  );
}
