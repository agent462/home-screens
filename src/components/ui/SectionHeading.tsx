'use client';

interface SectionHeadingProps {
  children: React.ReactNode;
}

export default function SectionHeading({ children }: SectionHeadingProps) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">{children}</span>
      <div className="flex-1 border-t border-neutral-700/50" />
    </div>
  );
}
