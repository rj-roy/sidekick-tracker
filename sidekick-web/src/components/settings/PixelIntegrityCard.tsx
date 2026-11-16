import { BadgeCheck } from 'lucide-react';

export default function PixelIntegrityCard() {
  return (
    <aside className="rounded-md border border-border bg-surface p-5">
      <div className="flex items-center gap-2">
        <BadgeCheck className="h-4 w-4 text-secondary" />
        <h3 className="text-sm font-semibold text-headline">Pixel Integrity</h3>
      </div>
      <p className="mt-2 text-xs text-caption">
        Invisible ultra-compact tracking pixels are running in live synchronization with our Tokyo
        and Frankfurt ingestion relays.
      </p>
      <div className="mt-4 flex items-center justify-between text-xs">
        <span className="font-medium text-caption">Relay Health</span>
        <span className="font-semibold text-primary">99.98% OK</span>
      </div>
    </aside>
  );
}