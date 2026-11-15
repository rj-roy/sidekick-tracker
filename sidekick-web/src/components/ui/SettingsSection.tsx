import { ReactNode } from 'react';

interface SettingsSectionProps {
  id: string;
  title: string;
  subtitle: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function SettingsSection({
  id,
  title,
  subtitle,
  action,
  children,
  className = '',
}: SettingsSectionProps) {
  return (
    <section
      id={id}
      className={`scroll-mt-24 rounded-md border border-slate-100 bg-white p-8  ${className}`}
    >
      <div className="mb-7 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
