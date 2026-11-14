import type { ReactNode } from "react";

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
    <header className="flex items-center justify-between px-4 py-3 border-b border-[#E8E8EC] bg-white">
      <div className="flex items-center space-x-2">
        {showBack && onBack && (
          <button
            onClick={onBack}
            className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-sm transition-colors"
            title="Back"
            aria-label="Back"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"></path>
            </svg>
          </button>
        )}
        <button
          onClick={onHome}
          className="flex items-center space-x-2 rounded-sm px-1 py-0.5 hover:bg-gray-100 transition-colors"
          title="Home"
          aria-label="Home"
        >
          <div className="w-7 h-7 rounded-sm bg-[#DC2626] flex items-center justify-center">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="16" x="2" y="4" rx="2"></rect>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
            </svg>
          </div>
          <span className="font-bold text-[14px] tracking-tight text-[#111827]">
            SideKick<sup className="ml-0.5 text-[9px] font-medium text-[#6B7280]">v0.1.2</sup>
          </span>
        </button>
      </div>

      <div className="flex items-center space-x-2">
        {children}
        {showSettings && (
          <button onClick={() => browser.tabs.create({ url: "https://sidekick-tracker-web.vercel.app/settings" })} className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-sm transition-colors" title="Back" aria-label="Back">
            <svg className="w-4 h-4 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
        )}
      </div>
    </header>
  );
}