import Link from "next/link";
import { Lock } from "lucide-react";

export default function Unauthorized() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-md border border-border bg-surface p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Lock className="h-7 w-7 text-destructive" />
        </div>

        <h1 className="mt-5 text-2xl font-semibold text-headline">
          Unauthorized
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-body">
          You need to sign in to access this page.
        </p>

        <div className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
          Error 401
        </div>

        <div className="mt-8 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/auth/google/login"
              className="block w-full rounded-md bg-primary px-4 py-2.5 text-center font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-surface"
            >
              Sign in
            </Link>
            <Link
              href="/auth/google/login"
              className="block w-full rounded-md border border-border bg-surface px-4 py-2.5 text-center font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-surface"
            >
              Sign Up
            </Link>
          </div>

          <div className="flex items-center justify-center gap-4 pt-2">
            <Link
              href="/"
              className="text-sm text-link transition-colors hover:text-foreground"
            >
              Go home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
