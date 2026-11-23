import Toggle from './Toggle';

interface ToggleRowProps {
  title: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
}

export default function ToggleRow({ title, description, enabled, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div>
        <p className="text-sm font-medium text-headline">{title}</p>
        <p className="mt-1 text-xs text-caption">{description}</p>
      </div>
      <Toggle enabled={enabled} onChange={onChange} label={title} />
    </div>
  );
}