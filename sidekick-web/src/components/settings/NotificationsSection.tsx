'use client';

import { SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import SettingsSection from '../ui/SettingsSection';
import ToggleRow from '../ui/ToggleRow';

const ROWS = [
  { key: 'desktop', title: 'Desktop notifications', description: 'Get a native browser toast immediately when an email is opened' },
  { key: 'dailyDigest', title: 'Daily summary email', description: 'Receive a compiled daily report of aggregate opens, clicks, and outreach KPIs' },
  { key: 'weeklyReport', title: 'Weekly performance report', description: 'Receive an analytical digest every Monday morning at 08:00 AM' },
  { key: 'clickAlerts', title: 'Click alerts', description: 'Notify in real-time when high-priority proposal or pricing links are clicked' },
] as const;

type Key = (typeof ROWS)[number]['key'];

export default function NotificationsSection() {
  const [prefs, setPrefs] = useState<Record<Key, boolean>>({
    desktop: true,
    dailyDigest: false,
    weeklyReport: true,
    clickAlerts: true,
  });

  const toggle = (key: Key) => (value: boolean) => setPrefs((p) => ({ ...p, [key]: value }));

  return (
    <SettingsSection
      id="notifications"
      title="Notifications"
      subtitle="Select how and when you want to receive tracking updates."
      action={<SlidersHorizontal className="h-5 w-5 text-caption" />}
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