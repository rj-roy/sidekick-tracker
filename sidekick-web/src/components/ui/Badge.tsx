import { ReactNode } from 'react';

const VARIANTS = {
  indigo: 'bg-muted text-body',
  teal: 'bg-muted text-body',
  gray: 'bg-muted text-caption',
  red: 'bg-muted text-destructive',
} as const;

interface BadgeProps {
  children: ReactNode;
  variant?: keyof typeof VARIANTS;
  dot?: boolean;
}

export default function Badge({ children, variant = 'indigo', dot = false }: BadgeProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium ${VARIANTS[variant]}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}