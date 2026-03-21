'use client';

export default function StatusDot({ configured }: { configured: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-xs">
      <span
        className={`w-1.5 h-1.5 rounded-full inline-block ${
          configured ? 'bg-green-400' : 'bg-neutral-600'
        }`}
      />
      <span className={configured ? 'text-green-400' : 'text-neutral-500'}>
        {configured ? 'Configured' : 'Not configured'}
      </span>
    </span>
  );
}
