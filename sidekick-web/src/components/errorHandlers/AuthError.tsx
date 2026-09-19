const AuthError = () => {
    return (
        <div className="min-h-screen bg-page flex items-center justify-center p-4 font-sans">

            <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-sm p-8 text-center">

                <div className="mx-auto w-14 h-14 flex items-center justify-center rounded-full bg-signal-soft">
                    <svg className="w-7 h-7 text-signal" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                </div>

                <h2 className="mt-5 text-xl font-semibold text-primary">
                    Authentication Failed
                </h2>

                <p className="mt-2 text-sm text-secondary leading-relaxed">
                    We couldn&apos;t verify your credentials. Please check your email and password, or ensure your account hasn&apos;t been locked.
                </p>

                <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-signal-soft text-signal text-xs font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-signal"></span>
                    Error 401: Invalid Credentials
                </div>

                <div className="mt-8 space-y-3">
                    <button className="w-full bg-signal hover:bg-signal-hover text-white font-medium py-2.5 px-4 rounded-lg transition-colors duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-signal focus:ring-offset-2 focus:ring-offset-surface">
                        Try Again
                    </button>

                    <div className="flex items-center justify-center gap-4 pt-2">
                        <a href="#" className="text-sm text-secondary hover:text-primary transition-colors duration-200">
                            Forgot password?
                        </a>
                        <span className="text-border">•</span>
                        <a href="#" className="text-sm text-secondary hover:text-primary transition-colors duration-200">
                            Contact support
                        </a>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AuthError;