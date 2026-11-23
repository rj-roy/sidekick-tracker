import { AlertTriangle, Trash2 } from 'lucide-react';

export default function DangerZoneSection() {
  return (
    <section id="danger" className="scroll-mt-24 rounded-md border border-destructive bg-surface p-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
          </div>
          <p className="mt-3 text-sm text-caption">
            Permanently delete your account and all associated telemetry records, open timestamps,
            link click data, and contact logs. This irreversible operation cannot be rolled back.
          </p>
        </div>
        <button className="flex shrink-0 items-center gap-2 rounded-md bg-destructive px-5 py-2.5 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive">
          <Trash2 className="h-4 w-4" />
          Delete Account
        </button>
      </div>
    </section>
  );
}