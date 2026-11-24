import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, NavLink, useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { GithubIcon } from "@/components/site/GithubIcon";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { Logo } from "@/components/site/Logo";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { cn } from "@/lib/utils";

const GITHUB_URL = "https://github.com/mindsgn/travel-safe";

export function SiteHeader() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.hash]);

  const navClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "rounded-md px-3 py-2 text-sm font-semibold transition-colors hover:text-primary",
      isActive ? "text-primary" : "text-muted-foreground",
    );

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 glass">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" aria-label={t("brand.name")} className="rounded-md">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          <Link to="/#how-it-works" className={navClass({ isActive: false })}>
            {t("nav.howItWorks")}
          </Link>
          <NavLink to="/docs" className={navClass}>
            {t("nav.docs")}
          </NavLink>
          <NavLink to="/support" className={navClass}>
            {t("nav.support")}
          </NavLink>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <LanguageSwitcher />
          <ThemeToggle />
          <Button variant="ghost" size="icon" asChild className="size-9 rounded-lg border border-border bg-card">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" aria-label={t("common.github")}>
              <GithubIcon className="size-4" />
            </a>
          </Button>
          <Button asChild size="sm" className="h-9 rounded-lg">
            <Link to="/docs#quickstart">{t("nav.getStarted")}</Link>
          </Button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-lg border border-border bg-card"
            aria-label={open ? t("common.close") : t("common.menu")}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="container-page flex flex-col gap-1 py-4" aria-label="Mobile">
            <Link to="/#how-it-works" className="rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-accent">
              {t("nav.howItWorks")}
            </Link>
            <Link to="/docs" className="rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-accent">
              {t("nav.docs")}
            </Link>
            <Link to="/support" className="rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-accent">
              {t("nav.support")}
            </Link>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-accent"
            >
              {t("common.github")}
            </a>
            <div className="mt-2 flex items-center justify-between gap-3 px-3">
              <LanguageSwitcher />
              <Button asChild size="sm">
                <Link to="/docs#quickstart">{t("nav.getStarted")}</Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
