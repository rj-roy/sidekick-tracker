const LINKS = ['System Status', 'Privacy Policy', 'Terms of Service'];

export default function Footer() {
  return (
    <footer className="border-t border-slate-200/60 bg-white">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-6 py-6 sm:flex-row sm:items-center sm:justify-between lg:px-10">
        <p className="text-xs text-slate-400">
          © 2024 TrackMail Inc. All rights reserved. High-precision email analytics.
        </p>
        <div className="flex items-center gap-6">
          {LINKS.map((link) => (
            <a key={link} href="#" className="text-xs text-slate-400 transition-colors hover:text-slate-600">
              {link}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
