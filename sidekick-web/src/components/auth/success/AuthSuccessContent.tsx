"use client";

import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

export default function AuthSuccessContent() {
  const searchParams = useSearchParams();

  const userName = searchParams.get("user") || "there";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-surface border border-border rounded-md p-8 text-center">
        <div className="mx-auto w-14 h-14 flex items-center justify-center rounded-full bg-muted">
          <CheckCircle2 className="w-7 h-7 text-primary" />
        </div>

        <h2 className="mt-5 text-xl font-semibold text-headline">
          Welcome back, {userName}!
        </h2>

        <p className="mt-2 text-sm text-body leading-relaxed">
          You have successfully authenticated. Your session is now active and
          secure.
        </p>

        <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-muted text-primary text-xs font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          Session Verified
        </div>

        <div className="mt-8 space-y-3">
          <button className="w-full bg-primary hover:bg-primary text-primary-foreground font-medium py-2.5 px-4 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-surface">
            Go to Dashboard
          </button>

          <div className="flex items-center justify-center gap-4 pt-2">
            <a
              href="/settings"
              className="text-sm text-link hover:text-foreground transition-colors duration-200"
            >
              Account Settings
            </a>
            <span className="text-border">•</span>
            <a
              href="/logout"
              className="text-sm text-link hover:text-foreground transition-colors duration-200"
            >
              Sign Out
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}