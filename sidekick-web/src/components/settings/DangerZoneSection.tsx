import { AlertTriangle, Trash2 } from 'lucide-react';

export default function DangerZoneSection() {
  return (
    <section id="danger" className="scroll-mt-24 rounded-md bg-red-50 p-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h2 className="text-lg font-bold text-red-500">Danger Zone</h2>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            Permanently delete your account and all associated telemetry records, open timestamps,
            link click data, and contact logs. This irreversible operation cannot be rolled back.
          </p>
        </div>
        <button className="flex shrink-0 items-center gap-2 rounded-sm bg-red-500 px-5 py-2.5 text-sm font-semibold text-white  transition-colors hover:bg-red-600">
          <Trash2 className="h-4 w-4" />
          Delete Account
        </button>
      </div>
    </section>
  );
}
