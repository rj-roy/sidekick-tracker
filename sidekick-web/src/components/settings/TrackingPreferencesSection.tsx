'use client';

import { useState } from 'react';
import Badge from '../ui/Badge';
import SettingsSection from '../ui/SettingsSection';
import ToggleRow from '../ui/ToggleRow';

const ROWS = [
  { key: 'openTracking', title: 'Open tracking', description: 'Know when recipients open your emails with precise timestamping' },
  { key: 'linkClickTracking', title: 'Link click tracking', description: 'Track clicks on links inside your emails and monitor click counts' },
  { key: 'replyDetection', title: 'Reply detection', description: 'Automatically detect when someone replies and close follow-up sequences' },
  { key: 'gmailBadge', title: 'Show tracking badge in Gmail', description: 'Display a small visual tracking indicator beside sent messages in your webmail' },
  { key: 'ignoreOwnOpens', title: 'Ignore my own opens', description: "Don't count opens from your current IP address and logged-in devices" },
] as const;

type Key = (typeof ROWS)[number]['key'];

export default function TrackingPreferencesSection() {
  const [prefs, setPrefs] = useState<Record<Key, boolean>>({
    openTracking: true,
    linkClickTracking: true,
    replyDetection: true,
    gmailBadge: false,
    ignoreOwnOpens: true,
  });

  const toggle = (key: Key) => (value: boolean) => setPrefs((p) => ({ ...p, [key]: value }));

  return (
    <SettingsSection
      id="tracking"
      title="Tracking Preferences"
      subtitle="Customize default tracking rules for outbound emails."
      action={<Badge variant="teal">Precision 99.4%</Badge>}
    >
      <div className="space-y-6">
        {ROWS.map((row) => (
          <ToggleRow
            key={row.key}
            title={row.title}
            description={row.description}
            enabled={prefs[row.key]}
            onChange={toggle(row.key)}
          />
        ))}
      </div>
    </SettingsSection>
  );
}
