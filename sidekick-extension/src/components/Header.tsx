import type { ReactNode } from "react";
import { ArrowLeft, Settings } from "lucide-react";

export default function Header({
  children,
  showSettings = true,
  onHome,
  onBack,
  showBack = false,
}: {
  children?: ReactNode;
  showSettings?: boolean;
  onHome?: () => void;
  onBack?: () => void;
  showBack?: boolean;
}) {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
      <div className="flex items-center space-x-2">
        {showBack && onBack && (
          <button
            onClick={onBack}
            className="p-1.5 text-caption hover:text-foreground hover:bg-muted rounded-md transition-colors"
            title="Back"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={onHome}
          className="flex items-center space-x-2 rounded-md px-1 py-0.5 hover:bg-muted transition-colors"
          title="Home"
          aria-label="Home"
        >
          <img src="/icon/32.png" alt="Sidekick" className="w-7 h-7 rounded-md object-contain" />
          <span className="font-semibold text-[14px] tracking-tight text-headline">
            SideKick<sup className="ml-0.5 text-[9px] font-medium text-caption">v0.1.2</sup>
          </span>
        </button>
      </div>

      <div className="flex items-center space-x-2">
        {children}
        {showSettings && (
          <button onClick={() => browser.tabs.create({ url: "https://sidekick-tracker-web.vercel.app/settings" })} className="p-1.5 text-caption hover:text-foreground hover:bg-muted rounded-md transition-colors" title="Back" aria-label="Back">
            <Settings className="w-4 h-4 text-caption" />
          </button>
        )}
      </div>
    </header>
  );
}