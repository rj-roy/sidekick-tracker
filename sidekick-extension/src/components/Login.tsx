import { useState } from "react";

export default function Login({ handleSignIn }: { handleSignIn: () => void }) {
  const [signingIn, setSigningIn] = useState(false);

  return (
    <main className="p-4">
      <div className="card p-6 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-md bg-muted">
            <img src="/icon/48.png" alt="Sidekick" className="size-6 rounded-md object-contain" />
          </div>

        <h2 className="text-[14px] font-semibold text-headline">
          Sign in to start tracking
        </h2>

        <p className="mt-1 text-[11px] text-caption">
          Connect your Gmail account to enable tracking.
        </p>

        <button
          onClick={handleSignIn}
          disabled={signingIn}
          className="mt-4 flex w-full items-center justify-center gap-2 btn-primary disabled:opacity-60"
        >
          {signingIn ? "Opening Google..." : "Sign in with Google"}
        </button>
      </div>
    </main>
  );
}