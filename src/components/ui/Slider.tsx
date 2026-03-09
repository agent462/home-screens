'use client';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  displayValue?: string;
  onChange: (value: number) => void;
}

export default function Slider({ label, value, min, max, step = 1, displayValue, onChange }: SliderProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-neutral-400 flex justify-between">
        <span>{label}</span>
        <span className="text-neutral-500">{displayValue ?? value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue-500"
      />
    </label>
  );
}
