'use client';

import { ChevronDown, Mail, Sun } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

const NAV_ITEMS = ['Dashboard', 'Emails', 'Reports', 'Templates', 'Contacts', 'Pricing', 'Settings'];

export default function Navbar() {
  const [active, setActive] = useState('Settings');

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6 lg:px-10">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-red-500 ">
            <Mail className="h-4 w-4 text-white" />
          </span>
          <span className="text-lg font-extrabold tracking-tight text-slate-900">TrackMail</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item}
              href={item === 'Dashboard' ? '/dashboard' : item === 'Settings' ? '/settings' : '#'}
              onClick={() => setActive(item)}
              className={`relative px-3 py-5 text-sm font-medium transition-colors ${
                active === item ? 'text-red-500' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item}
              {active === item && (
                <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-red-500" />
              )}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            aria-label="Toggle theme"
            className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <Sun className="h-5 w-5" />
          </button>
          <button className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500 text-sm font-bold text-white">
              J
            </span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-sm font-semibold text-slate-800">Jibon</span>
              <span className="block text-xs text-slate-400">Roy</span>
            </span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>
        </div>
      </div>
    </header>
  );
}
