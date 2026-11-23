const LINKS = ['System Status', 'Privacy Policy', 'Terms of Service'];

export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-6 py-6 sm:flex-row sm:items-center sm:justify-between lg:px-10">
        <p className="text-xs text-caption">
          © 2024 TrackMail Inc. All rights reserved. High-precision email analytics.
        </p>
        <div className="flex items-center gap-6">
          {LINKS.map((link) => (
            <a key={link} href="#" className="text-xs text-caption transition-colors hover:text-foreground">
              {link}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}