'use client';

import { Check, ChevronDown, Upload } from 'lucide-react';
import { ChangeEvent, useState } from 'react';
import Badge from '../ui/Badge';
import SettingsSection from '../ui/SettingsSection';

const LABEL = 'mb-1 block text-[11px] font-semibold uppercase tracking-wider text-caption';
const INPUT =
  'w-full border-b border-border bg-transparent pb-2 pt-1 text-sm text-foreground outline-none transition-colors focus:border-ring';

const TIMEZONES = ['Asia/Dhaka (GMT+6)', 'UTC (GMT+0)', 'America/New_York (GMT-5)', 'Europe/London (GMT+1)', 'Asia/Tokyo (GMT+9)'];
const LANGUAGES = ['English (US)', 'English (UK)', 'Deutsch', 'Français', '日本語'];

export default function ProfileSection() {
  const [form, setForm] = useState({
    fullName: 'Jibon Roy',
    email: 'jibon@example.com',
    company: 'TrackMail Inc.',
    jobTitle: 'Product Manager',
    timezone: TIMEZONES[0],
    language: LANGUAGES[0],
  });

  const update =
    (key: keyof typeof form) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <SettingsSection
      id="profile"
      title="Profile"
      subtitle="Update your photo and personal details."
      action={<Badge variant="indigo">ID: TM-88491</Badge>}
    >
      <div className="flex flex-wrap items-center gap-5">
        <div className="relative">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground ring-4 ring-muted">
            J
          </span>
          <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-surface bg-secondary" />
        </div>
        <div>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 rounded-md bg-muted px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted">
              <Upload className="h-4 w-4" />
              Upload new
            </button>
            <button className="text-sm font-medium text-caption transition-colors hover:text-foreground">
              Remove
            </button>
          </div>
          <p className="mt-2 text-xs text-caption">
            JPG, GIF or PNG. Max size 2MB. Recommended dimensions 256×256px.
          </p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-2">
        <div>
          <label htmlFor="fullName" className={LABEL}>Full Name</label>
          <input id="fullName" className={INPUT} value={form.fullName} onChange={update('fullName')} />
        </div>
        <div>
          <label htmlFor="email" className={LABEL}>Email Address</label>
          <input id="email" type="email" className={INPUT} value={form.email} onChange={update('email')} />
        </div>
        <div>
          <label htmlFor="company" className={LABEL}>Company (Optional)</label>
          <input id="company" className={INPUT} value={form.company} onChange={update('company')} />
        </div>
        <div>
          <label htmlFor="jobTitle" className={LABEL}>Job Title (Optional)</label>
          <input id="jobTitle" className={INPUT} value={form.jobTitle} onChange={update('jobTitle')} />
        </div>
        <div>
          <label htmlFor="timezone" className={LABEL}>Timezone</label>
          <div className="relative">
            <select id="timezone" className={`${INPUT} appearance-none pr-8`} value={form.timezone} onChange={update('timezone')}>
              {TIMEZONES.map((tz) => <option key={tz}>{tz}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-1 top-1.5 h-4 w-4 text-caption" />
          </div>
        </div>
        <div>
          <label htmlFor="language" className={LABEL}>Language</label>
          <div className="relative">
            <select id="language" className={`${INPUT} appearance-none pr-8`} value={form.language} onChange={update('language')}>
              {LANGUAGES.map((lang) => <option key={lang}>{lang}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-1 top-1.5 h-4 w-4 text-caption" />
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-end gap-4">
        <button className="text-sm font-medium text-caption transition-colors hover:text-foreground">
          Cancel
        </button>
        <button className="flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary">
          <Check className="h-4 w-4" />
          Save Changes
        </button>
      </div>
    </SettingsSection>
  );
}