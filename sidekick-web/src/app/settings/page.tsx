import ConnectedAccountsSection from '@/components/settings/ConnectedAccountsSection';
import DangerZoneSection from '@/components/settings/DangerZoneSection';
import NotificationsSection from '@/components/settings/NotificationsSection';
import PixelIntegrityCard from '@/components/settings/PixelIntegrityCard';
import ProfileSection from '@/components/settings/ProfileSection';
import SettingsHeader from '@/components/settings/SettingsHeader';
import SettingsSidebar from '@/components/settings/SettingsSidebar';
import TrackingPreferencesSection from '@/components/settings/TrackingPreferencesSection';
import { getSession } from '@/lib/auth/auth.server';

export const metadata = { title: 'Settings · TrackMail' };

export default async function SettingsPage() {
  const session = await getSession();
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased">
      <SettingsHeader />

      <div className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-10 lg:px-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[230px_1fr]">
          <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <SettingsSidebar />
            <PixelIntegrityCard />
          </div>

          <div className="space-y-8">
            <ProfileSection />
            <TrackingPreferencesSection />
            <NotificationsSection />
            <ConnectedAccountsSection />
            <DangerZoneSection />
          </div>
        </div>
      </div>
    </div>
  );
}