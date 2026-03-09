'use client';

import Slider from '@/components/ui/Slider';
import { DISPLAY_PRESETS, DISPLAY_TRANSFORMS } from '@/lib/constants';

interface DisplaySettings {
  displayWidth: number;
  displayHeight: number;
  displayTransform: string;
  rotationInterval: number;
}

interface Props {
  values: DisplaySettings;
  onChange: (updates: Partial<DisplaySettings>) => void;
}

export default function DisplaySection({ values, onChange }: Props) {
  const { displayWidth, displayHeight, displayTransform, rotationInterval } = values;

  return (
    <section>
      <h3 className="text-sm font-medium text-neutral-300 mb-3 uppercase tracking-wider">
        Display
      </h3>
      <label className="block mb-3">
        <span className="text-xs text-neutral-400">Display Resolution</span>
        <select
          value={`${displayWidth}x${displayHeight}`}
          onChange={(e) => {
            if (e.target.value === 'custom') return;
            const [w, h] = e.target.value.split('x').map(Number);
            onChange({ displayWidth: w, displayHeight: h });
          }}
          className="mt-1 block w-full rounded-md bg-neutral-800 border border-neutral-600 text-sm text-neutral-200 px-3 py-2 focus:outline-none focus:border-blue-500"
        >
          {DISPLAY_PRESETS.map((p) => (
            <option key={`${p.width}x${p.height}`} value={`${p.width}x${p.height}`}>
              {p.label}
            </option>
          ))}
          {!DISPLAY_PRESETS.some((p) => p.width === displayWidth && p.height === displayHeight) && (
            <option value={`${displayWidth}x${displayHeight}`}>
              Custom ({displayWidth} x {displayHeight})
            </option>
          )}
        </select>
        <p className="text-xs text-neutral-500 mt-1">
          Match this to your physical display. Changing resolution affects the module canvas size.
        </p>
      </label>
      <label className="block mb-3">
        <span className="text-xs text-neutral-400">Display Orientation</span>
        <select
          value={displayTransform}
          onChange={(e) => onChange({ displayTransform: e.target.value })}
          className="mt-1 block w-full rounded-md bg-neutral-800 border border-neutral-600 text-sm text-neutral-200 px-3 py-2 focus:outline-none focus:border-blue-500"
        >
          {DISPLAY_TRANSFORMS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <p className="text-xs text-neutral-500 mt-1">
          Physical rotation applied via wlr-randr on the kiosk. Takes effect on next boot.
        </p>
      </label>
      <Slider
        label="Screen Rotation (seconds)"
        value={rotationInterval}
        min={5}
        max={120}
        step={5}
        onChange={(v) => onChange({ rotationInterval: v })}
      />
    </section>
  );
}
