import clsx from 'clsx';
import Link from 'next/link';

const baseStyles =
  'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a] disabled:opacity-50 disabled:pointer-events-none';

const variantStyles = {
  solid:
    'bg-cyan-500 text-[#0a0a0a] hover:bg-cyan-400 active:bg-cyan-600',
  outline:
    'border border-[#333] text-neutral-200 hover:border-cyan-400/50 hover:text-cyan-300 active:border-cyan-400',
  plain:
    'text-neutral-400 hover:text-neutral-200',
};

type ButtonProps = {
  variant?: keyof typeof variantStyles;
  className?: string;
  href?: string;
  children: React.ReactNode;
};

export function Button({
  variant = 'solid',
  className,
  href,
  children,
  ...rest
}: ButtonProps & React.ComponentPropsWithoutRef<'button'>) {
  const classes = clsx(baseStyles, variantStyles[variant], className);

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
