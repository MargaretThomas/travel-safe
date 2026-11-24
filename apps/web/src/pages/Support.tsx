import { ArrowUpRight, BookOpen, Bug, HeartPulse, LifeBuoy, LockKeyhole, Server } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Seo } from "@/components/Seo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiUrl } from "@/lib/api";

const GITHUB_URL = "https://github.com/mindsgn/travel-safe";
const WORKER_URL = (import.meta.env.VITE_WORKER_URL || "https://travel-safe-worker.seni-tembe.workers.dev").replace(/\/+$/, "");

type Faq = { q: string; a: string };

export function SupportPage() {
  const { t } = useTranslation();
  const faq = t("support.faq", { returnObjects: true }) as Faq[];

  return (
    <>
      <Seo title={t("seo.support.title")} description={t("seo.support.description")} path="/support" />

      <section className="border-b border-border mesh-glow">
        <div className="container-page py-14 sm:py-20">
          <Badge variant="outline" className="gap-1.5 border-primary/25 bg-card/70">
            <LifeBuoy className="size-3.5 text-primary" />
            {t("support.eyebrow")}
          </Badge>
          <h1 className="display-title mt-5 max-w-2xl text-[2.7rem] sm:text-[4rem]">{t("support.title")}</h1>
          <p className="mt-4 max-w-2xl text-[1rem] leading-relaxed text-muted-foreground">
            {t("support.description")}
          </p>
        </div>
      </section>

      <section className="container-page grid gap-4 py-12 md:grid-cols-2">
        <Card className="p-6">
          <span className="grid size-10 place-items-center rounded-lg bg-secondary text-secondary-foreground">
            <Bug className="size-5" />
          </span>
          <h2 className="mt-4 text-lg font-extrabold tracking-[-0.02em]">{t("support.issuesTitle")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("support.issuesBody")}</p>
          <Button asChild variant="outline" className="mt-5 w-fit">
            <a href={`${GITHUB_URL}/issues/new`} target="_blank" rel="noreferrer">
              {t("support.issuesCta")}
              <ArrowUpRight />
            </a>
          </Button>
        </Card>

        <Card className="p-6">
          <span className="grid size-10 place-items-center rounded-lg bg-danger-background text-danger">
            <LockKeyhole className="size-5" />
          </span>
          <h2 className="mt-4 text-lg font-extrabold tracking-[-0.02em]">{t("support.securityTitle")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("support.securityBody")}</p>
          <Button asChild variant="outline" className="mt-5 w-fit">
            <a href={`${GITHUB_URL}/security/advisories/new`} target="_blank" rel="noreferrer">
              {t("support.securityCta")}
              <ArrowUpRight />
            </a>
          </Button>
        </Card>

        <Card className="p-6">
          <span className="grid size-10 place-items-center rounded-lg bg-secondary text-secondary-foreground">
            <BookOpen className="size-5" />
          </span>
          <h2 className="mt-4 text-lg font-extrabold tracking-[-0.02em]">{t("support.docsTitle")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("support.docsBody")}</p>
          <Button asChild variant="outline" className="mt-5 w-fit">
            <Link to="/docs">{t("support.docsCta")}</Link>
          </Button>
        </Card>

        <Card className="p-6">
          <span className="grid size-10 place-items-center rounded-lg bg-secondary text-secondary-foreground">
            <HeartPulse className="size-5" />
          </span>
          <h2 className="mt-4 text-lg font-extrabold tracking-[-0.02em]">{t("support.statusTitle")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("support.statusBody")}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={apiUrl("/health")} target="_blank" rel="noreferrer">
                <Server />
                {t("support.statusApi")}
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`${WORKER_URL}/health`} target="_blank" rel="noreferrer">
                <HeartPulse />
                {t("support.statusWorker")}
              </a>
            </Button>
          </div>
        </Card>
      </section>

      <section className="container-page grid gap-10 pb-20 lg:grid-cols-[0.7fr_1.3fr]">
        <div>
          <h2 className="display-title text-[2rem]">{t("support.faqTitle")}</h2>
        </div>
        <div className="space-y-3">
          {faq.map((item) => (
            <div key={item.q} className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-extrabold">{item.q}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
