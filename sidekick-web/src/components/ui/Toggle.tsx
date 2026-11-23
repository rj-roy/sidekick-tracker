'use client';

interface ToggleProps {
  enabled: boolean;
  onChange?: (value: boolean) => void;
  label?: string;
}

export default function Toggle({ enabled, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={() => onChange?.(!enabled)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-border transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
        enabled ? 'bg-primary' : 'bg-muted'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface ring-1 ring-border transition-transform duration-200 ${
          enabled ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}