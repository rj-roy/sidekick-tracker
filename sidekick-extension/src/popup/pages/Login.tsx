import { Mail } from "lucide-react";
import { useState } from "react";
import { authApi } from "../../api/auth.api";

export default function Login() {
  const [signingIn, setSigningIn] = useState(false);

  const handleSignIn = async () => {
    if (signingIn) return;
    setSigningIn(true);
    await authApi.login();
    setSigningIn(false);
  };

  return (
    <main className="p-4">
      <div className="rounded-xl border border-border bg-surface p-6 text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-signal-soft">
          <Mail className="size-6 text-signal" />
        </div>

        <h2 className="text-[14px] font-semibold">
          Sign in to start tracking
        </h2>

        <p className="mt-1 text-[11px] text-secondary">
          Connect your Gmail account to enable tracking.
        </p>

        <button
          onClick={handleSignIn}
          disabled={signingIn}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-signal px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-signal-hover disabled:opacity-60"
        >
          {signingIn ? "Opening Google..." : "Sign in with Google"}
        </button>
      </div>
    </main>
  );
}