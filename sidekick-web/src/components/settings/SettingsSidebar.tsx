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
    <nav className="rounded-md border border-slate-100 bg-white p-3 ">
      <ul className="space-y-1">
        {MENU.map(({ id, label, icon: Icon }) => {
          const active = activeId === id;
          return (
            <li key={id}>
              <a
                href={`#${id}`}
                onClick={() => setActiveId(id)}
                className={`flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? 'bg-red-100/80 text-red-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-red-500' : 'text-slate-400'}`} />
                {label}
              </a>
            </li>
          );
        })}
      </ul>

      <div className="my-3 border-t border-slate-100" />

      <a
        href="#danger"
        onClick={() => setActiveId('danger')}
        className="flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50"
      >
        <AlertTriangle className="h-4 w-4" />
        Danger Zone
      </a>
    </nav>
  );
}
