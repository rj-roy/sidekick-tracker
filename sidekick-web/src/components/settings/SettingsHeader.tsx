import Badge from '../ui/Badge';

export default function SettingsHeader() {
  return (
    <div className="border-b border-border">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-6 pb-8 pt-10 sm:flex-row sm:items-center sm:justify-between lg:px-10">
        <div>
          <h1 className="text-3xl font-semibold text-headline">Settings</h1>
          <p className="mt-2 text-sm text-caption">
            Manage your account, tracking and notification preferences
          </p>
        </div>
        <Badge variant="indigo" dot>
          Pro Account Active
        </Badge>
      </div>
    </div>
  );
}