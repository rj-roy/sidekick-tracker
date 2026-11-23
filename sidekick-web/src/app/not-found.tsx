import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-md border border-border bg-surface p-8 text-center">
        <div className="mx-auto flex h-15 w-15 items-center justify-center rounded-full bg-muted">
          <p className="text-secondary text-xl">404!</p>
        </div>

        <h1 className="mt-5 text-2xl font-semibold text-headline">Page not found</h1>
        <p className="mt-2 text-sm leading-relaxed text-body">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
          Error 404
        </div>

        <div className="mt-8 space-y-3">
          <Link
            href="/"
            className="block w-full rounded-md bg-primary px-4 py-2.5 text-center font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-surface"
          >
            Go home
          </Link>

          <div className="flex items-center justify-center gap-4 pt-2">
            <Link
              href="/dashboard"
              className="text-sm text-link transition-colors hover:text-foreground"
            >
              Dashboard
            </Link>
            <Link
              href="/contact-us"
              className="text-sm text-link transition-colors hover:text-foreground"
            >
              Contact support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
