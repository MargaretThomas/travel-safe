import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Logo } from "@/components/site/Logo";

const GITHUB_URL = "https://github.com/mindsgn/travel-safe";

export function SiteFooter() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card/40">
      <div className="container-page py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link to="/" aria-label={t("brand.name")}>
              <Logo />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">{t("footer.tagline")}</p>
            <p className="mt-4 max-w-xs text-xs leading-relaxed text-muted-foreground/80">
              {t("footer.disclaimer")}
            </p>
          </div>

          <FooterColumn title={t("footer.product")}>
            <Link to="/#how-it-works">{t("footer.howItWorks")}</Link>
            <Link to="/docs">{t("footer.docs")}</Link>
            <Link to="/support">{t("footer.support")}</Link>
          </FooterColumn>

          <FooterColumn title={t("footer.developers")}>
            <Link to="/docs#api">{t("footer.docs")}</Link>
            <Link to="/docs#worker">{t("nav.howItWorks")}</Link>
            <a href={`${GITHUB_URL}`} target="_blank" rel="noreferrer">
              {t("footer.github")}
            </a>
            <a href="/llms.txt" target="_blank" rel="noreferrer">
              {t("footer.llms")}
            </a>
          </FooterColumn>

          <FooterColumn title={t("footer.legal")}>
            <Link to="/privacy">{t("footer.privacy")}</Link>
            <Link to="/terms">{t("footer.terms")}</Link>
            <a href={`${GITHUB_URL}/blob/main/LICENSE.md`} target="_blank" rel="noreferrer">
              MIT License
            </a>
          </FooterColumn>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>{t("footer.copyright", { year })}</p>
          <p className="max-w-lg sm:text-right">Built on Cloudflare Workers · D1 · R2</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-foreground">{title}</h2>
      <ul className="mt-4 flex flex-col gap-2.5 text-sm text-muted-foreground [&_a]:transition-colors [&_a:hover]:text-primary">
        {children}
      </ul>
    </div>
  );
}
