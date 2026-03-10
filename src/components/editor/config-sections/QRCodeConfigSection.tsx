'use client';

import ColorPicker from '@/components/ui/ColorPicker';
import { useModuleConfig } from '@/hooks/useModuleConfig';
import { INPUT_CLASS } from '@/components/editor/PropertyPanel';
import type { ModuleInstance } from '@/types/config';

export function QRCodeConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { config: c, set } = useModuleConfig<{ data?: string; label?: string; fgColor?: string; bgColor?: string }>(mod, screenId);

  return (
    <>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Data (URL or text)</span>
        <input
          type="text"
          value={(c.data as string) || ''}
          onChange={(e) => set({ data: e.target.value })}
          placeholder="https://example.com"
          className={INPUT_CLASS}
        />
      </label>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Label</span>
        <input
          type="text"
          value={(c.label as string) || ''}
          onChange={(e) => set({ label: e.target.value })}
          className={INPUT_CLASS}
        />
      </label>
      <ColorPicker label="QR Color" value={(c.fgColor as string) || '#ffffff'} onChange={(v) => set({ fgColor: v })} />
      <ColorPicker label="Background" value={(c.bgColor as string) || 'transparent'} onChange={(v) => set({ bgColor: v })} />
    </>
  );
}
