'use client';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export default function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  return (
    <label className="flex items-center justify-between gap-2">
      <span className="text-xs text-neutral-400">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value.startsWith('#') ? value : '#ffffff'}
          onChange={(e) => onChange(e.target.value)}
          className="w-6 h-6 rounded border border-neutral-600 bg-transparent cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-28 px-2 py-1 text-xs bg-neutral-800 border border-neutral-600 rounded text-neutral-200"
        />
      </div>
    </label>
  );
}
