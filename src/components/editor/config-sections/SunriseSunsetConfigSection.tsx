'use client';

import Toggle from '@/components/ui/Toggle';
import { useModuleConfig } from '@/hooks/useModuleConfig';
import type { ModuleInstance } from '@/types/config';

export function SunriseSunsetConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { config: c, set } = useModuleConfig<{ showDayLength?: boolean; showGoldenHour?: boolean }>(mod, screenId);

  return (
    <>
      <Toggle label="Show Day Length" checked={c.showDayLength !== false} onChange={(v) => set({ showDayLength: v })} />
      <Toggle label="Show Golden Hour" checked={!!c.showGoldenHour} onChange={(v) => set({ showGoldenHour: v })} />
      <p className="text-xs text-neutral-500">Uses location from global settings.</p>
    </>
  );
}
