import { AlertCircle } from "lucide-react";

const AuthError = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-surface border border-border rounded-sm p-8 text-center">
        <div className="mx-auto w-14 h-14 flex items-center justify-center rounded-full bg-muted">
          <AlertCircle className="w-7 h-7 text-destructive" />
        </div>

        <h2 className="mt-5 text-xl font-semibold text-foreground">
          Authentication Failed
        </h2>

        <p className="mt-2 text-sm text-secondary leading-relaxed">
          We couldn&apos;t verify your credentials. Please check your email and
          password, or ensure your account hasn&apos;t been locked.
        </p>

        <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-destructive text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-destructive"></span>
          Error 401: Invalid Credentials
        </div>

        <div className="mt-8 space-y-3">
          <button className="w-full bg-destructive hover:bg-destructive text-primary-foreground font-medium py-2.5 px-4 rounded-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-surface">
            Try Again
          </button>

          <div className="flex items-center justify-center gap-4 pt-2">
            <a
              href="#"
              className="text-sm text-secondary hover:text-foreground transition-colors duration-200"
            >
              Forgot password?
            </a>
            <span className="text-border">•</span>
            <a
              href="#"
              className="text-sm text-secondary hover:text-foreground transition-colors duration-200"
            >
              Contact support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthError;
