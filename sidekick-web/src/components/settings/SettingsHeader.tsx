import Badge from '../ui/Badge';

export default function SettingsHeader() {
  return (
    <div className="border-b border-slate-200/60">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-6 pb-8 pt-10 sm:flex-row sm:items-center sm:justify-between lg:px-10">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Settings</h1>
          <p className="mt-2 text-sm text-slate-500">
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
