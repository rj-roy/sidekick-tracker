import { Check } from "lucide-react";

export default function TrackingStatus() {
  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold">
          Tracking Status
        </h2>

        <span className="rounded-full bg-success-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-success">
          ON
        </span>
      </div>

      {/* Current Status */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-signal">
            <Check className="size-5 text-white" strokeWidth={2.5} />
          </div>

          <div>
            <p className="text-[14px] font-semibold text-signal">
              Opened
            </p>

            <p className="mt-0.5 text-[12px] text-secondary">
              2 minutes ago
            </p>

            <p className="mt-1 text-[10px] text-muted">
              Today, 10:24 AM
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-lg border border-border">
          <div className="px-3 py-2.5">
            <p className="text-[10px] text-secondary">
              Opened
            </p>

            <p className="mt-1 text-[16px] font-semibold text-signal">
              3
            </p>

            <p className="text-[9px] text-muted">
              Total
            </p>
          </div>

          <div className="border-l border-border px-3 py-2.5">
            <p className="text-[10px] text-secondary">
              Clicked
            </p>

            <p className="mt-1 text-[16px] font-semibold text-info">
              1
            </p>

            <p className="text-[9px] text-muted">
              Total
            </p>
          </div>

          <div className="border-l border-border px-3 py-2.5">
            <p className="text-[10px] text-secondary">
              Delivered
            </p>

            <p className="mt-1 text-[16px] font-semibold text-success">
              5
            </p>

            <p className="text-[9px] text-muted">
              Total
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
