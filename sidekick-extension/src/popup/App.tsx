import {
  Settings,
  Mail,
  ExternalLink,
  CircleHelp,
  Check,
} from "lucide-react";

export default function App() {
  return (
    <div className="w-[360px] bg-page text-primary">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-surface px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-signal-soft">
            <Mail className="size-4 text-signal" />
          </div>

          <span className="text-[15px] font-semibold">
            TrackMail
          </span>
        </div>

        <button className="rounded-md p-1.5 text-muted hover:bg-page hover:text-primary">
          <Settings className="size-4" />
        </button>
      </header>

      {/* Content */}
      <main className="p-4">
        {/* Tracking Status */}
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

        {/* Recent Emails */}
        <section className="mt-5">
          <h2 className="mb-2.5 text-[13px] font-semibold">
            Recent Emails
          </h2>

          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            {/* Email 1 */}
            <div className="px-3.5 py-3">
              <div className="flex gap-2.5">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-signal" />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[11px] font-semibold">
                      Project Proposal
                    </p>

                    <span className="shrink-0 text-[9px] text-muted">
                      2m ago
                    </span>
                  </div>

                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="truncate text-[10px] text-secondary">
                      john@example.com
                    </p>

                    <span className="rounded bg-signal-soft px-1.5 py-0.5 text-[8px] font-semibold text-signal">
                      Opened
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Email 2 */}
            <div className="px-3.5 py-3">
              <div className="flex gap-2.5">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-info" />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[11px] font-semibold">
                      Meeting Follow-up
                    </p>

                    <span className="shrink-0 text-[9px] text-muted">
                      1h ago
                    </span>
                  </div>

                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="truncate text-[10px] text-secondary">
                      sarah@example.com
                    </p>

                    <span className="rounded bg-info-soft px-1.5 py-0.5 text-[8px] font-semibold text-info">
                      Clicked
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Email 3 */}
            <div className="px-3.5 py-3">
              <div className="flex gap-2.5">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-success" />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[11px] font-semibold">
                      Contract Document
                    </p>

                    <span className="shrink-0 text-[9px] text-muted">
                      3h ago
                    </span>
                  </div>

                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="truncate text-[10px] text-secondary">
                      michael@example.com
                    </p>

                    <span className="rounded bg-success-soft px-1.5 py-0.5 text-[8px] font-semibold text-success">
                      Delivered
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Dashboard */}
        <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-secondary">
          <ExternalLink className="size-3.5" />
          View Dashboard
        </button>

        {/* Help */}
        <div className="mt-3 flex justify-center">
          <button className="flex items-center gap-1 text-[10px] text-muted hover:text-primary">
            <CircleHelp className="size-3" />
            How it works
          </button>
        </div>
      </main>
    </div>
  );
}