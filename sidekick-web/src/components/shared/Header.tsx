"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, User, ChevronDown } from "lucide-react";
import ThemeSwitch from "@/ui/ThemeSwitch";
import { useSession } from "@/lib/auth/auth.client";

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const session = useSession();

  const navItems = session.data?.user ? [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Emails", href: "/emails" },
    { label: "Settings", href: "/settings" },
    { label: "Documentation", href: "/documentation" },
    { label: "Contact Us", href: "/contact-us" },
  ] : [
    { label: "Documentation", href: "/documentation" },
    { label: "Contact Us", href: "/contact-us" },
  ];


  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface px-4 py-0 sm:px-8">
      <div className="flex h-16 items-center justify-between">
        <Link href={'/'} className="flex items-center gap-2">
          <Image
            src="/favicon.ico"
            alt="Sidekick"
            width={32}
            height={32}
            className="h-8 w-8 rounded-md object-contain"
          />
          <span className="text-lg font-semibold text-headline">Sidekick</span>
        </Link>

        <button
          className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors sm:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <nav className="hidden items-center gap-1 sm:flex">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`group relative rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-primary ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {item.label}
                <div
                  className={`mx-auto mt-0.5 h-0.5 w-full rounded-md bg-primary transition-opacity ${active ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}
                />
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
          <div className="mr-3">
            <ThemeSwitch />
          </div>
          {session.isPending ? null : session.data?.user ? (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <User className="h-4 w-4" />
              </div>
              <div className="text-sm">
                <div className="font-medium text-headline leading-tight">
                  {session.data.user.name || "User"}
                </div>
                <div className="text-muted-foreground leading-tight text-xs">
                  {session.data.user.email}
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
          ) : (
            <>
              <Link
                href="/auth/google/login"
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:no-underline"
              >
                Sign in
              </Link>
              <Link
                href="/auth/google/login"
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:no-underline bg-black dark:bg-white text-white dark:text-black"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>

      {mobileOpen && (
        <div className="flex flex-col gap-1 border-t border-border py-3 sm:hidden">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {item.label}
              </Link>
            );
          })}
          <div className="mt-2 flex items-center gap-1 border-t border-border pt-3">
            <div className="mr-3">
              <ThemeSwitch />
            </div>
            {session.data ? (
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <User className="h-4 w-4" />
                </div>
                <div className="text-sm">
                  <div className="font-medium text-headline leading-tight">
                    {session.data.user.name || "User"}
                  </div>
                  <div className="text-muted-foreground leading-tight text-xs">
                    {session.data.user.email}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <Link
                  href="/auth/google/login"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:no-underline"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/google/login"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:no-underline bg-black text-white dark:bg-white dark:text-black"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
