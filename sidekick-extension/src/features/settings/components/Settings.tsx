import { useEffect, useState } from "react";
import { ArrowLeft, RefreshCw, Trash2, Mail } from "lucide-react";
import { settingsApi } from "../api";
import type { GoogleAccountResponse } from "../types";

const Settings = ({ onBack }: { onBack: () => void }) => {
  const [account, setAccount] = useState<GoogleAccountResponse["account"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setAccount((await settingsApi.getAccount()).account);
    } catch (err) {
      setAccount(null);
      setError(err instanceof Error ? err.message : "Failed to load account");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleRefresh = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await settingsApi.refreshToken();
      setAccount(res.account);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh token");
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("Disconnect your Gmail account?")) return;
    setBusy(true);
    setError(null);
    try {
      await settingsApi.disconnect();
      setAccount(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="p-4">
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1 rounded-md p-1 text-[11px] text-muted hover:bg-page hover:text-primary"
        >
          <ArrowLeft className="size-3.5" />
          Back
        </button>
        <h2 className="text-[14px] font-semibold">Settings</h2>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-surface">
        <div className="px-3.5 py-3">
          <p className="text-[12px] font-semibold">Google Account</p>

          {loading ? (
            <p className="mt-2 text-[11px] text-muted">Loading…</p>
          ) : account ? (
            <div className="mt-2 flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-lg bg-signal-soft">
                <Mail className="size-4 text-signal" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium">{account.email}</p>
                <p className="text-[10px] text-muted">
                  {account.expiresAt
                    ? `Token expires ${new Date(account.expiresAt).toLocaleString()}`
                    : "Connected"}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-[11px] text-secondary">
              {error ?? "No Google account connected."}
            </p>
          )}
        </div>

        <div className="border-t border-border" />

        <div className="flex items-center justify-end gap-2 px-3.5 py-2.5">
          <button
            onClick={handleRefresh}
            disabled={busy || !account}
            className="flex items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5 text-[11px] font-semibold text-primary transition hover:bg-page disabled:opacity-50"
          >
            <RefreshCw className="size-3" />
            Refresh
          </button>
          <button
            onClick={handleDisconnect}
            disabled={busy || !account}
            className="flex items-center gap-1.5 rounded-lg bg-danger/10 px-3 py-1.5 text-[11px] font-semibold text-danger transition hover:bg-danger/20 disabled:opacity-50"
          >
            <Trash2 className="size-3" />
            Disconnect
          </button>
        </div>
      </div>
    </main>
  );
};

export default Settings;