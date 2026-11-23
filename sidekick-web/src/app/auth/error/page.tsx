import { Lock } from "lucide-react";
import Link from "next/link";

const AuthError = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-surface border border-border rounded-md p-8 text-center">
        <div className="mx-auto w-14 h-14 flex items-center justify-center rounded-full bg-muted">
          <Lock className="w-7 h-7 text-destructive" />
        </div>

        <h2 className="mt-5 text-xl font-semibold text-headline">
          Authentication Failed
        </h2>

        <p className="mt-2 text-sm text-body leading-relaxed">
          We couldn&apos;t verify your credentials. Please try again, or ensure
          your account hasn&apos;t been locked.
        </p>

        <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-muted text-destructive text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-destructive"></span>
          Error 401: Invalid Credentials
        </div>

        <div className="mt-8 space-y-3">
          <button className="w-full bg-destructive hover:bg-destructive text-destructive-foreground font-medium py-2.5 px-4 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-surface">
            <Link href="/auth/google/login">Try Again</Link>
          </button>

          <div className="flex items-center justify-center gap-4 pt-2">
            <Link
              href="#"
              className="text-sm text-link hover:text-foreground transition-colors duration-200"
            >
              Contact support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthError;