import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <>
      <Seo title="404 — Travel Safe" description={t("notFound.body")} path="/404" noindex />
      <section className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{t("notFound.eyebrow")}</p>
        <h1 className="display-title mt-4 text-5xl sm:text-6xl">{t("notFound.title")}</h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">{t("notFound.body")}</p>
        <Button asChild className="mt-7">
          <Link to="/">
            <ArrowLeft />
            {t("notFound.cta")}
          </Link>
        </Button>
      </section>
    </>
  );
}
