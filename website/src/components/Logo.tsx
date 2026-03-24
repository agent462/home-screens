import clsx from 'clsx';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={clsx('flex shrink-0 items-center gap-3', className)}>
      <div
        aria-hidden="true"
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/25 bg-[linear-gradient(160deg,#0f172a_0%,#10253d_48%,#143a58_100%)] shadow-[0_8px_24px_rgba(6,182,212,0.15)]"
      >
        <svg
          viewBox="0 0 48 48"
          className="h-6 w-6"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M9 21.5L24 10L39 21.5"
            stroke="#A5F3FC"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect
            x="11.5"
            y="20.5"
            width="25"
            height="16"
            rx="5"
            fill="#082F49"
            stroke="#67E8F9"
            strokeWidth="2.5"
          />
          <rect
            x="17"
            y="25"
            width="14"
            height="2.5"
            rx="1.25"
            fill="#A5F3FC"
            opacity="0.95"
          />
          <rect
            x="17"
            y="29.5"
            width="9"
            height="2.5"
            rx="1.25"
            fill="#CFFAFE"
            opacity="0.85"
          />
          <path
            d="M29 36.5V31.5H33V36.5"
            stroke="#E0F2FE"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-sm font-semibold tracking-[0.16em] uppercase text-cyan-300/90">
          Home
        </span>
        <span className="text-[0.95rem] font-semibold tracking-[0.08em] text-neutral-50">
          Screens
        </span>
      </div>
    </div>
  );
}
