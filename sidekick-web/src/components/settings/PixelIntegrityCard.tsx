import { BadgeCheck } from 'lucide-react';

export default function PixelIntegrityCard() {
  return (
    <aside className="rounded-md bg-indigo-100/60 p-5">
      <div className="flex items-center gap-2">
        <BadgeCheck className="h-4 w-4 text-indigo-600" />
        <h3 className="text-sm font-bold text-slate-800">Pixel Integrity</h3>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">
        Invisible ultra-compact tracking pixels are running in live synchronization with our Tokyo
        and Frankfurt ingestion relays.
      </p>
      <div className="mt-4 flex items-center justify-between text-xs">
        <span className="font-medium text-slate-600">Relay Health</span>
        <span className="font-semibold text-emerald-500">99.98% OK</span>
      </div>
    </aside>
  );
}
