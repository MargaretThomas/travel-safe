import { Link } from "react-router-dom";

import { Logo } from "@/components/site/Logo";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { ThemeToggle } from "@/components/site/ThemeToggle";

export function EmergencyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border glass">
        <div className="container-page flex h-16 items-center justify-between gap-3">
          <Link to="/" aria-label="Travel Safe">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border py-6">
        <div className="container-page flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>Travel Safe · The Makers</p>
          <p>A safety net, not an emergency service.</p>
        </div>
      </footer>
    </div>
  );
}
