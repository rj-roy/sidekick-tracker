'use client';

import { ChevronDown } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import ThemeSwitch from '@/ui/ThemeSwitch';

const NAV_ITEMS = ['Dashboard', 'Emails', 'Reports', 'Templates', 'Contacts', 'Pricing', 'Settings'];

export default function Navbar() {
  const [active, setActive] = useState('Settings');

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6 lg:px-10">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/favicon.ico" alt="TrackMail" width={32} height={32} className="h-8 w-8 rounded-md object-contain" />
          <span className="text-lg font-semibold text-headline">TrackMail</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item}
              href={item === 'Dashboard' ? '/dashboard' : item === 'Settings' ? '/settings' : '#'}
              onClick={() => setActive(item)}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active === item ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {item}
              {active === item && (
                <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-md bg-primary" />
              )}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeSwitch />
          <button className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              J
            </span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-sm font-semibold text-headline">Jibon</span>
              <span className="block text-xs text-caption">Roy</span>
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </header>
  );
}