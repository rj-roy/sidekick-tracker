'use client';

import { AlertTriangle, Bell, CreditCard, Plug, Shield, Target, User } from 'lucide-react';
import { useState } from 'react';

const MENU = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'tracking', label: 'Tracking Preferences', icon: Target },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'billing', label: 'Billing & Plan', icon: CreditCard },
  { id: 'security', label: 'Security', icon: Shield },
];

export default function SettingsSidebar() {
  const [activeId, setActiveId] = useState('profile');

  return (
    <nav className="rounded-md border border-border bg-surface p-3">
      <ul className="space-y-1">
        {MENU.map(({ id, label, icon: Icon }) => {
          const active = activeId === id;
          return (
            <li key={id}>
              <a
                href={`#${id}`}
                onClick={() => setActiveId(id)}
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? 'bg-muted text-foreground' : 'text-caption hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-foreground' : 'text-caption'}`} />
                {label}
              </a>
            </li>
          );
        })}
      </ul>

      <div className="my-3 border-t border-border" />

      <a
        href="#danger"
        onClick={() => setActiveId('danger')}
        className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-muted"
      >
        <AlertTriangle className="h-4 w-4" />
        Danger Zone
      </a>
    </nav>
  );
}