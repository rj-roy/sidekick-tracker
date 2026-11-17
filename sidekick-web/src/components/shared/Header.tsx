"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, Menu, X, User, ChevronDown, Sun } from "lucide-react";
import ThemeSwitch from "@/ui/ThemeSwitch";
import { useSession } from "@/lib/auth/auth.client";

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const session = useSession();
  console.log(session);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface px-4 py-0 sm:px-8">
      <div className="flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Mail className="h-4 w-4" />
          </div>
          <span className="text-lg font-semibold text-headline">Sidekick</span>
        </div>

        <button
          className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors sm:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <nav className="hidden items-center gap-1 sm:flex">
          {[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Emails", href: "#" },
            { label: "Reports", href: "#" },
            { label: "Templates", href: "#" },
            { label: "Contacts", href: "#" },
            { label: "Settings", href: "/settings" },
          ].map((item) => {
            const active = pathname === item.href;
            return (
               <Link
                 key={item.label}
                 href={item.href}
                 className={`group relative rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-primary ${
                   active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                 }`}
               >
                 {item.label}
                 <div
                   className={`mx-auto mt-0.5 h-0.5 w-full rounded-md bg-primary transition-opacity ${
                     active ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                   }`}
                 />
               </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-4 sm:flex">
          <ThemeSwitch />
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <User className="h-4 w-4" />
            </div>
            <div className="text-sm">
              <div className="font-medium text-headline leading-tight">
                Jibon
              </div>
              <div className="text-muted-foreground leading-tight text-xs">
                Roy
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="flex flex-col gap-1 border-t border-border py-3 sm:hidden">
          {[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Emails", href: "#" },
            { label: "Reports", href: "#" },
            { label: "Templates", href: "#" },
            { label: "Contacts", href: "#" },
            { label: "Settings", href: "/settings" },
          ].map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <div className="mt-2 flex items-center gap-3 border-t border-border pt-3">
            <button className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <Sun className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <User className="h-4 w-4" />
              </div>
              <div className="text-sm">
                <div className="font-medium text-headline leading-tight">
                  Jibon
                </div>
                <div className="text-muted-foreground leading-tight text-xs">
                  Roy
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
