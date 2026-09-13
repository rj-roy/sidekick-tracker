import { useState } from "react";
import { Settings as SettingsIcon, Mail } from "lucide-react";
import { MainRouter } from "../features/auth/components";
import { Settings } from "../features/settings/components";

export default function App() {
  const [openSettings, setOpenSettings] = useState(false);

  return (
    <div className="w-[360px] bg-page text-primary">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-surface px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-signal-soft">
            <Mail className="size-4 text-signal" />
          </div>

          <span className="text-[15px] font-semibold">
            SideKick
          </span>
        </div>

        <button
          onClick={() => setOpenSettings((prev) => !prev)}
          className="rounded-md p-1.5 text-muted hover:bg-page hover:text-primary"
        >
          <SettingsIcon className="size-4" />
        </button>
      </header>

      {openSettings ? <Settings onBack={() => setOpenSettings(false)} /> : <MainRouter />}
    </div>
  );
}