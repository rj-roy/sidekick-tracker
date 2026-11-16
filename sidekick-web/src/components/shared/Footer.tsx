export default function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-surface px-4 py-5 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p className="text-xs text-caption">
          © 2024 Sidekick Inc. All rights reserved. High-precision email
          analytics.
        </p>
        <div className="flex items-center gap-6">
          {["System Status", "Privacy Policy", "Terms of Service"].map(
            (link) => (
              <a
                key={link}
                href="#"
                className="text-xs text-caption hover:text-foreground transition-colors"
              >
                {link}
              </a>
            ),
          )}
        </div>
      </div>
    </footer>
  );
}