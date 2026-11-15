'use client';

import { Inbox, Link2, Mail, Plus } from 'lucide-react';
import { useState } from 'react';
import Badge from '../ui/Badge';
import SettingsSection from '../ui/SettingsSection';

const PROVIDERS = [
  {
    id: 'google',
    name: 'Google Workspace / Gmail',
    icon: Mail,
    iconClass: 'bg-red-100 text-red-500',
    connectedMeta: 'jibon@gmail.com • Synced 2 mins ago',
    idleMeta: 'Connect your Gmail workspace to track outgoing mail',
    connected: true,
  },
  {
    id: 'outlook',
    name: 'Microsoft Outlook 365',
    icon: Inbox,
    iconClass: 'bg-indigo-100 text-indigo-500',
    connectedMeta: 'jibon@outlook.com • Synced just now',
    idleMeta: 'Connect Outlook or Exchange mailbox to track outgoing mail',
    connected: false,
  },
];

export default function ConnectedAccountsSection() {
  const [providers, setProviders] = useState(PROVIDERS);

  const toggleProvider = (id: string) =>
    setProviders((prev) => prev.map((p) => (p.id === id ? { ...p, connected: !p.connected } : p)));

  return (
    <SettingsSection
      id="integrations"
      title="Connected Accounts"
      subtitle="Manage third-party email providers connected to TrackMail."
      action={
        <button className="flex items-center gap-1.5 rounded-sm bg-indigo-100 px-3.5 py-2 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-200">
          <Plus className="h-3.5 w-3.5" />
          Add Provider
        </button>
      }
    >
      <div className="space-y-4">
        {providers.map((provider) => {
          const Icon = provider.icon;
          return (
            <div
              key={provider.id}
              className="flex flex-col gap-4 rounded-sm bg-indigo-50/60 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-4">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-sm ${provider.iconClass}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800">{provider.name}</p>
                    {provider.connected ? (
                      <Badge variant="teal" dot>Connected</Badge>
                    ) : (
                      <Badge variant="gray">Inactive</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {provider.connected ? provider.connectedMeta : provider.idleMeta}
                  </p>
                </div>
              </div>

              {provider.connected ? (
                <button
                  onClick={() => toggleProvider(provider.id)}
                  className="self-start text-sm font-medium text-slate-500 transition-colors hover:text-red-500 sm:self-auto"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={() => toggleProvider(provider.id)}
                  className="flex items-center gap-2 self-start rounded-sm bg-white px-4 py-2 text-sm font-semibold text-slate-700  transition-colors hover:bg-slate-50 sm:self-auto"
                >
                  <Link2 className="h-4 w-4" />
                  Connect
                </button>
              )}
            </div>
          );
        })}
      </div>
    </SettingsSection>
  );
}
