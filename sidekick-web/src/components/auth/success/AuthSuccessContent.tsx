"use client";

import { useSearchParams } from "next/navigation";

export default function AuthSuccessContent() {
    const searchParams = useSearchParams();

    // Reads the ?user= parameter from the URL, falls back to "there" if missing
    const userName = searchParams.get("user") || "there";

    return (
        <div className="min-h-screen bg-page flex items-center justify-center p-4 font-sans">
            <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-sm p-8 text-center">

                {/* Success Icon */}
                <div className="mx-auto w-14 h-14 flex items-center justify-center rounded-full bg-success-soft">
                    <svg className="w-7 h-7 text-success" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>

                {/* Personalized Greeting */}
                <h2 className="mt-5 text-xl font-semibold text-primary">
                    Welcome back, {userName}!
                </h2>

                {/* Description */}
                <p className="mt-2 text-sm text-secondary leading-relaxed">
                    You have successfully authenticated. Your session is now active and secure.
                </p>

                {/* Live Status Pill */}
                <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success-soft text-success text-xs font-medium">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                    </span>
                    Session Verified
                </div>

                {/* Action Buttons */}
                <div className="mt-8 space-y-3">
                    {/* Primary Action */}
                    <button className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2.5 px-4 rounded-lg transition-colors duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface">
                        Go to Dashboard
                    </button>

                    {/* Secondary Links */}
                    <div className="flex items-center justify-center gap-4 pt-2">
                        <a href="/settings" className="text-sm text-secondary hover:text-primary transition-colors duration-200">
                            Account Settings
                        </a>
                        <span className="text-border">•</span>
                        <a href="/logout" className="text-sm text-secondary hover:text-primary transition-colors duration-200">
                            Sign Out
                        </a>
                    </div>
                </div>

            </div>
        </div>
    );
}