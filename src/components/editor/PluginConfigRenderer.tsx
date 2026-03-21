'use client';

import type { ModuleInstance } from '@/types/config';
import type { PluginConfigSchema, PluginConfigProperty } from '@/types/plugins';
import { useEditorStore } from '@/stores/editor-store';
import Slider from '@/components/ui/Slider';
import ColorPicker from '@/components/ui/ColorPicker';
import { INPUT_CLASS } from './PropertyPanel';

interface PluginConfigRendererProps {
  mod: ModuleInstance;
  screenId: string;
  schema: PluginConfigSchema;
}

/** Auto-generates config controls from a JSON Schema with ui:widget annotations. */
export default function PluginConfigRenderer({ mod, screenId, schema }: PluginConfigRendererProps) {
  const { updateModule } = useEditorStore();
  const config = mod.config;

  const setConfig = (key: string, value: unknown) => {
    updateModule(screenId, mod.id, {
      config: { ...config, [key]: value },
    });
  };

  if (!schema?.properties) return null;

  return (
    <div className="space-y-3">
      {Object.entries(schema.properties).map(([key, prop]) => (
        <ConfigField
          key={key}
          fieldKey={key}
          prop={prop}
          value={config[key]}
          onChange={(v) => setConfig(key, v)}
        />
      ))}
    </div>
  );
}

function ConfigField({
  fieldKey,
  prop,
  value,
  onChange,
}: {
  fieldKey: string;
  prop: PluginConfigProperty;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const label = prop.title ?? fieldKey;
  const widget = prop['ui:widget'] ?? inferWidget(prop);

  switch (widget) {
    case 'toggle':
      return (
        <label className="flex items-center justify-between gap-2">
          <span className="text-xs text-neutral-400">{label}</span>
          <input
            type="checkbox"
            checked={Boolean(value ?? prop.default)}
            onChange={(e) => onChange(e.target.checked)}
            className="accent-blue-500"
          />
        </label>
      );

    case 'slider':
      return (
        <Slider
          label={label}
          value={Number(value ?? prop.default ?? prop.minimum ?? 0)}
          min={prop.minimum ?? 0}
          max={prop.maximum ?? 100}
          step={prop['ui:step'] ?? 1}
          onChange={onChange}
        />
      );

    case 'number':
      return (
        <label className="flex flex-col gap-0.5">
          <span className="text-xs text-neutral-400">{label}</span>
          <input
            type="number"
            value={Number(value ?? prop.default ?? 0)}
            min={prop.minimum}
            max={prop.maximum}
            step={prop['ui:step']}
            onChange={(e) => onChange(Number(e.target.value))}
            className={INPUT_CLASS}
          />
        </label>
      );

    case 'select':
      return (
        <label className="flex flex-col gap-0.5">
          <span className="text-xs text-neutral-400">{label}</span>
          <select
            value={String(value ?? prop.default ?? '')}
            onChange={(e) => onChange(e.target.value)}
            className={INPUT_CLASS}
          >
            {(prop.enum ?? []).map((opt, i) => (
              <option key={String(opt)} value={String(opt)}>
                {prop.enumLabels?.[i] ?? String(opt)}
              </option>
            ))}
          </select>
        </label>
      );

    case 'color':
      return (
        <ColorPicker
          label={label}
          value={String(value ?? prop.default ?? '#000000')}
          onChange={onChange}
        />
      );

    case 'text':
    default:
      return (
        <label className="flex flex-col gap-0.5">
          <span className="text-xs text-neutral-400">{label}</span>
          <input
            type="text"
            value={String(value ?? prop.default ?? '')}
            onChange={(e) => onChange(e.target.value)}
            className={INPUT_CLASS}
          />
        </label>
      );
  }
}

/** Infer a reasonable widget from the property type/constraints when no ui:widget is specified. */
function inferWidget(prop: PluginConfigProperty): string {
  if (prop.type === 'boolean') return 'toggle';
  if (prop.enum) return 'select';
  if (prop.type === 'number' && prop.minimum != null && prop.maximum != null) return 'slider';
  if (prop.type === 'number') return 'number';
  return 'text';
}
