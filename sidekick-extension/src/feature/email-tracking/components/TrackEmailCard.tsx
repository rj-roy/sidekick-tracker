import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import type { CardState, ComposeState, TrackResult } from "@/feature/email-tracking/TrackingTypes";
import { GET_COMPOSE_STATE, TRACK_EMAIL } from "@/shared/constants/api";
import { send } from "@/shared/utils/message/runtimeMessage";

const FAILURE_MESSAGES: Record<string, string> = {
  "no-gmail-tab": "Opened a new Gmail compose window. Click Track again once it's ready.",
  "no-compose": "Open a compose or reply window in Gmail, then try again.",
  "already-tracked": "This draft already has a tracking pixel.",
  "content-unreachable": "Reload the Gmail tab, then try again.",
  unauthenticated: "Your session expired. Sign in again from the popup.",
  "server-error": "Could not reach the tracking service. Try again in a moment.",
};

export default function TrackEmailCard() {
  const [state, setState] = useState<CardState>({ status: "checking" });

  const refresh = useCallback(async () => {
    const compose = await send<ComposeState>({ type: GET_COMPOSE_STATE });

    if (!compose) {
      setState({ status: "error", message: "Could not reach the Gmail tab." });
      return;
    };

    setState(compose.trackedToken
      ? { status: "tracked", trackingToken: compose.trackedToken }
      : { status: "idle", compose });
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleTrack = async () => {
    setState({ status: "working" });

    const result = await send<TrackResult>({ type: TRACK_EMAIL });

    if (!result) {
      setState({ status: "error", message: "Could not reach the tracking service." });
      return;
    };

    if (result.ok) {
      setState({ status: "tracked", trackingToken: result.trackingToken });
      return;
    };

    if (result.reason === "already-tracked" && result.message) {
      setState({ status: "tracked", trackingToken: result.message });
      return;
    };

    setState({
      status: "error",
      message: FAILURE_MESSAGES[result.reason] ?? "Something went wrong. Try again.",
    });
  };

  const handleOpenGmail = async () => {
    await browser.tabs.create({ url: "https://mail.google.com/mail/u/0/#compose" });
    window.close();
  };

  return (
    <div className="rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h3 className="text-[12px] font-semibold">Track this email</h3>

        <button
          onClick={() => void refresh()}
          className="rounded p-1 text-muted hover:bg-page hover:text-primary"
          title="Re-check the open draft"
        >
          <RefreshCw className="size-3.5" />
        </button>
      </div>

      <div className="p-3">
        {state.status === "checking" && (
          <div className="flex items-center gap-2 text-[11px] text-muted">
            <Loader2 className="size-3.5 animate-spin" />
            Looking for an open draft...
          </div>
        )}

        {state.status === "working" && (
          <div className="flex items-center gap-2 text-[11px] text-muted">
            <Loader2 className="size-3.5 animate-spin" />
            Adding the tracking pixel...
          </div>
        )}

        {state.status === "idle" && (
          <>
            {state.compose.supported ? (
              <>
                <p className="text-[11px] text-secondary">
                  {state.compose.hasCompose
                    ? `Ready to track${state.compose.subject ? ` "${state.compose.subject}"` : ""}.`
                    : "No compose or reply window is open in Gmail."}
                </p>

                <button
                  onClick={() => void handleTrack()}
                  disabled={!state.compose.hasCompose}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-signal px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-signal-hover disabled:opacity-50"
                >
                  Click to Track this mail
                </button>
              </>
            ) : (
              <>
                <p className="text-[11px] text-secondary">
                  Open a draft in Gmail, then come back here to track this mail.
                </p>

                <button
                  onClick={() => void handleOpenGmail()}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-signal px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-signal-hover"
                >
                  <ExternalLink className="size-3.5" />
                  Open Gmail
                </button>
              </>
            )}
          </>
        )}

        {state.status === "tracked" && (
          <div className="flex items-start gap-2 rounded-md bg-success-soft px-2.5 py-2">
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-success">Tracking is enabled for this email</p>
            </div>
          </div>
        )}

        {state.status === "error" && (
          <div className="flex items-start gap-2 rounded-md bg-warning-soft px-2.5 py-2">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warning" />
            <p className="text-[11px] text-warning">{state.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
