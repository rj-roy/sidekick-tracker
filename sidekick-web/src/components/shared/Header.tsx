"use client";

import React, { useState } from "react";
import { Mail, Sun, ChevronDown, Menu, X, User } from "lucide-react";

const NAV_ITEMS = [
  "Dashboard",
  "Emails",
  "Reports",
  "Templates",
  "Contacts",
  "Settings",
];

export default function Header() {
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface px-4 py-0 sm:px-8">
      <div className="flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-signal">
            <Mail className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold text-foreground">Sidekick</span>
        </div>

        <button
          className="rounded-sm p-2 text-muted-foreground hover:bg-page hover:text-secondary transition-colors sm:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <nav className="hidden items-center gap-1 sm:flex">
          {NAV_ITEMS.map((item) => (
            <button
              key={item}
              onClick={() => setActiveNav(item)}
              className={`rounded-sm px-3 py-2 text-sm font-medium transition-colors ${
                activeNav === item
                  ? "text-signal"
                  : "text-secondary hover:text-primary"
              }`}
            >
              {item}
              {activeNav === item && (
                <div className="mx-auto mt-0.5 h-0.5 w-full rounded-full bg-signal" />
              )}
            </button>
          ))}
        </nav>

        <div className="hidden items-center gap-4 sm:flex">
          <button className="rounded-full p-2 text-muted-foreground hover:bg-page hover:text-secondary transition-colors">
            <Sun className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-signal text-white">
              <User className="h-4 w-4" />
            </div>
            <div className="text-sm">
              <div className="font-medium text-foreground leading-tight">
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
          {NAV_ITEMS.map((item) => (
            <button
              key={item}
              onClick={() => {
                setActiveNav(item);
                setMobileOpen(false);
              }}
              className={`rounded-sm px-3 py-2 text-left text-sm font-medium transition-colors ${
                activeNav === item
                  ? "text-signal"
                  : "text-secondary hover:text-primary"
              }`}
            >
              {item}
            </button>
          ))}
          <div className="mt-2 flex items-center gap-3 border-t border-border pt-3">
            <button className="rounded-full p-2 text-muted-foreground hover:bg-page hover:text-secondary transition-colors">
              <Sun className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-signal text-white">
                <User className="h-4 w-4" />
              </div>
              <div className="text-sm">
                <div className="font-medium text-foreground leading-tight">
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
