import { useTranslation } from "react-i18next";

import { supportedLanguages, setLanguage, type LanguageCode } from "@/i18n";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n, t } = useTranslation();
  const current = (i18n.resolvedLanguage ?? i18n.language ?? "en").split("-")[0];

  function handleChange(code: LanguageCode) {
    setLanguage(code);
    const url = new URL(window.location.href);
    if (code === "en") {
      url.searchParams.delete("lng");
    } else {
      url.searchParams.set("lng", code);
    }
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }

  return (
    <label className={cn("relative inline-flex items-center", className)}>
      <span className="sr-only">{t("common.language")}</span>
      <select
        value={current}
        onChange={(event) => handleChange(event.target.value as LanguageCode)}
        className="h-9 cursor-pointer appearance-none rounded-lg border border-border bg-card py-0 pl-3 pr-8 text-xs font-semibold text-foreground transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={t("common.language")}
      >
        {supportedLanguages.map((language) => (
          <option key={language.code} value={language.code}>
            {t(language.labelKey)}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2.5 text-[0.6rem] text-muted-foreground">▼</span>
    </label>
  );
}
