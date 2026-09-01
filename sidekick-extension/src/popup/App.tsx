import { Settings, Mail } from "lucide-react";
import AuthRouter from "./components/AuthRouter";

export default function App() {
  return (
    <div className="w-[360px] bg-page text-primary">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-surface px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-signal-soft">
            <Mail className="size-4 text-signal" />
          </div>

          <span className="text-[15px] font-semibold">
            TrackMail
          </span>
        </div>

        <button className="rounded-md p-1.5 text-muted hover:bg-page hover:text-primary">
          <Settings className="size-4" />
        </button>
      </header>

      <AuthRouter />
    </div>
  );
}