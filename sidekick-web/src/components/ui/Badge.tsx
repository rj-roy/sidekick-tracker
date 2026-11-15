import { ReactNode } from 'react';

const VARIANTS = {
  indigo: 'bg-indigo-100 text-indigo-700',
  teal: 'bg-teal-100 text-teal-700',
  gray: 'bg-slate-200/70 text-slate-500',
  red: 'bg-red-100 text-red-600',
} as const;

interface BadgeProps {
  children: ReactNode;
  variant?: keyof typeof VARIANTS;
  dot?: boolean;
}

export default function Badge({ children, variant = 'indigo', dot = false }: BadgeProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${VARIANTS[variant]}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
