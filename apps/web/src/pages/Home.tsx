import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Link2,
  LockKeyhole,
  MapPin,
  Play,
  Radio,
  ShieldCheck,
  Sparkles,
  TimerReset,
  UploadCloud,
  Zap,
} from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Reveal } from "@/components/Reveal";
import { Seo } from "@/components/Seo";
import { CodeBlock } from "@/components/site/CodeBlock";
import { GithubIcon } from "@/components/site/GithubIcon";
import { SectionHeading } from "@/components/site/SectionHeading";
import { TrailMap } from "@/components/site/TrailMap";
import { CountUp } from "@/components/reactbits/CountUp";
import { ShinyText } from "@/components/reactbits/ShinyText";
import { SpotlightCard } from "@/components/reactbits/SpotlightCard";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Stat = { value: number; suffix: string; label: string };
type Feature = { title: string; body: string };
type Step = { title: string; body: string };
type Endpoint = { method: string; path: string; label: string };
type FaqItem = { q: string; a: string };

const FEATURE_ICONS = [CheckCircle2, TimerReset, UploadCloud, Link2];
const STEP_ICONS = [CheckCircle2, Clock3, MapPin];

const PREVIEW_POINTS = [
  { latitude: -33.9046, longitude: 18.4001 },
  { latitude: -33.9079, longitude: 18.3968 },
  { latitude: -33.9105, longitude: 18.3904 },
  { latitude: -33.9147, longitude: 18.3861 },
  { latitude: -33.9192, longitude: 18.3835 },
];

const CURL_EXAMPLE = `API="https://travel-safe-api.seni-tembe.workers.dev"
KEY="ts_live_..."

# Create a user. The API key is shown once.
curl -X POST "$API/v1/users" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Thandi Mokoena","email":"thandi@example.com","check_in_interval_minutes":1440}'

# Reset the dead-man switch
curl -X POST "$API/v1/check-ins" \\
  -H "Authorization: Bearer $KEY"`;

export function HomePage() {
  const { t } = useTranslation();
  const stats = t("hero.stats", { returnObjects: true }) as Stat[];
  const features = t("features.items", { returnObjects: true }) as Feature[];
  const steps = t("how.steps", { returnObjects: true }) as Step[];
  const endpoints = t("developer.endpoints", { returnObjects: true }) as Endpoint[];
  const faq = t("faq.items", { returnObjects: true }) as FaqItem[];
  const bullets = t("developer.bullets", { returnObjects: true }) as string[];

  const jsonLd = useMemo(
    () => [
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faq.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      },
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "Travel Safe",
        applicationCategory: "SafetyApplication",
        operatingSystem: "Web",
        description: t("hero.description"),
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        featureList: features.map((feature) => feature.title),
      },
    ],
    [faq, features, t],
  );

  return (
    <>
      <Seo title={t("seo.home.title")} description={t("seo.home.description")} path="/" jsonLd={jsonLd} />

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 mesh-glow" />
        <div className="pointer-events-none absolute inset-0 grid-pattern opacity-70" />
        <div className="container-page relative grid items-center gap-14 pb-20 pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pb-28 lg:pt-20">
          <div>
            <Reveal>
              <Badge variant="outline" className="gap-2 border-primary/25 bg-card/70 px-3 py-1.5 text-[0.72rem] text-foreground backdrop-blur">
                <Sparkles className="size-3.5 text-primary" />
                {t("hero.eyebrow")}
              </Badge>
            </Reveal>

            <Reveal delay={0.05}>
              <h1 className="display-title mt-6 text-[3.15rem] text-foreground sm:text-[4.4rem] lg:text-[5rem]">
                <span className="text-primary">{t("hero.titleLead")}</span>
                <br />
                {t("hero.titleTail")}
              </h1>
            </Reveal>

            <Reveal delay={0.1}>
              <p className="mt-6 max-w-xl text-[1.02rem] leading-relaxed text-muted-foreground sm:text-[1.08rem]">
                {t("hero.description")}
              </p>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="group">
                  <Link to="/docs#quickstart">
                    {t("hero.primary")}
                    <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/#how-it-works">{t("hero.secondary")}</Link>
                </Button>
              </div>
            </Reveal>

            <Reveal delay={0.2}>
              <p className="mt-5 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <ShieldCheck className="size-4 text-primary" />
                {t("hero.note")}
              </p>
            </Reveal>

            <Reveal delay={0.25}>
              <dl className="mt-10 grid grid-cols-2 gap-y-6 border-t border-border pt-6 sm:grid-cols-4 sm:gap-0 sm:divide-x sm:divide-border">
                {stats.map((stat) => (
                  <div key={stat.label} className="sm:px-4 sm:first:pl-0">
                    <dd className="display-title text-2xl text-foreground sm:text-3xl">
                      <CountUp to={stat.value} suffix={stat.suffix} />
                    </dd>
                    <dt className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      {stat.label}
                    </dt>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>

          <Reveal delay={0.12} y={26}>
            <div className="relative mx-auto max-w-[430px]">
              <div className="absolute -inset-8 rounded-[3rem] bg-primary/15 blur-3xl" />
              <div className="relative rounded-[1.7rem] border border-border bg-card p-2.5 shadow-2xl shadow-primary/10">
                <div className="rounded-[1.25rem] border border-border bg-background p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                        <ShieldCheck className="size-4" />
                      </span>
                      <div>
                        <p className="text-[0.72rem] font-bold leading-none">Travel Safe</p>
                        <p className="mt-1 text-[0.62rem] text-muted-foreground">{t("hero.preview.badge")}</p>
                      </div>
                    </div>
                    <Badge variant="danger" className="gap-1.5 px-2 py-1 text-[0.62rem]">
                      <span className="relative flex size-1.5">
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-danger opacity-70" />
                        <span className="relative inline-flex size-1.5 rounded-full bg-danger" />
                      </span>
                      {t("hero.preview.active")}
                    </Badge>
                  </div>

                  <div className="mt-5 flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-full bg-secondary text-sm font-extrabold text-secondary-foreground">
                      TM
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{t("hero.preview.name")}</p>
                      <p className="truncate text-[0.68rem] text-muted-foreground">{t("hero.preview.updated")}</p>
                    </div>
                    <LockKeyhole className="ml-auto size-4 text-primary" />
                  </div>

                  <div className="relative mt-4 h-44 overflow-hidden rounded-xl border border-border sm:h-48">
                    <TrailMap points={PREVIEW_POINTS} label="Example 7-day route" />
                    <div className="absolute inset-x-2.5 bottom-2.5 rounded-lg border border-border bg-card/95 px-3 py-2 shadow-sm backdrop-blur">
                      <p className="flex items-center gap-1.5 text-[0.78rem] font-bold">
                        <MapPin className="size-3.5 text-primary" />
                        {t("hero.preview.location")}
                      </p>
                      <p className="mt-0.5 text-[0.62rem] text-muted-foreground">{t("hero.preview.accuracy")}</p>
                    </div>
                    <div className="absolute right-2.5 top-2.5 rounded-full border border-border bg-card/95 px-2 py-1 text-[0.58rem] font-bold uppercase tracking-wide text-muted-foreground backdrop-blur">
                      {t("hero.preview.trail")}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-card p-2.5">
                    <span className="grid size-9 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                      <Play className="size-4 fill-current" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.75rem] font-bold">{t("hero.preview.media")}</p>
                      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full w-2/5 rounded-full bg-primary" />
                      </div>
                    </div>
                    <Radio className="size-4 text-primary" />
                  </div>
                </div>
              </div>

              <div className="absolute -left-5 bottom-14 hidden animate-float-soft rounded-xl border border-border bg-card px-3.5 py-2.5 shadow-xl sm:block">
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  Next check-in
                </p>
                <p className="mt-0.5 text-sm font-extrabold text-foreground">11h 42m</p>
              </div>
              <div className="absolute -right-4 top-24 hidden rounded-xl border border-border bg-card px-3.5 py-2.5 shadow-xl sm:block">
                <p className="flex items-center gap-1.5 text-[0.66rem] font-bold">
                  <Link2 className="size-3 text-primary" />
                  Contact link revoked
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section aria-label="Platform" className="border-y border-border bg-card/50">
        <div className="container-page grid gap-4 py-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Zap, label: t("trust.edge") },
            { icon: Radio, label: t("trust.storage") },
            { icon: GithubIcon, label: t("trust.open") },
            { icon: LockKeyhole, label: t("trust.private") },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2.5 text-[0.76rem] font-semibold text-muted-foreground">
              <Icon className="size-4 text-primary" />
              {label}
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="container-page scroll-mt-24 py-20 sm:py-24">
        <Reveal>
          <SectionHeading
            eyebrow={t("features.eyebrow")}
            title={t("features.title")}
            description={t("features.description")}
          />
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {features.map((feature, index) => {
            const Icon = FEATURE_ICONS[index] ?? CheckCircle2;
            return (
              <Reveal key={feature.title} delay={index * 0.05}>
                <SpotlightCard className="h-full p-7">
                  <div className="grid size-11 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-5 text-[1.05rem] font-extrabold tracking-[-0.02em]">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
                </SpotlightCard>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-24 border-y border-border bg-card/45 py-20 sm:py-24">
        <div className="container-page">
          <Reveal>
            <SectionHeading eyebrow={t("how.eyebrow")} title={t("how.title")} />
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = STEP_ICONS[index] ?? CheckCircle2;
              return (
                <Reveal key={step.title} delay={index * 0.08}>
                  <div className="relative h-full rounded-xl border border-border bg-card p-6">
                    <div className="flex items-center justify-between">
                      <span className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground">
                        <Icon className="size-5" />
                      </span>
                      <span className="display-title text-4xl text-border">0{index + 1}</span>
                    </div>
                    <h3 className="mt-6 text-[1.05rem] font-extrabold tracking-[-0.02em]">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="container-page py-20 sm:py-24">
        <Reveal>
          <div className="overflow-hidden rounded-2xl border border-[#213a33] bg-[#0d1a16] text-[#dce9e4] shadow-2xl shadow-primary/10">
            <div className="grid gap-10 p-7 sm:p-10 lg:grid-cols-[1fr_1.05fr] lg:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5fc3a6]">
                  {t("developer.eyebrow")}
                </p>
                <h2 className="display-title mt-3 text-[2.1rem] text-white sm:text-[2.7rem]">
                  <ShinyText text={t("developer.title")} />
                </h2>
                <p className="mt-4 max-w-lg text-sm leading-relaxed text-[#a8c0b7]">{t("developer.body")}</p>
                <ul className="mt-6 grid gap-2.5 text-sm text-[#dce9e4] sm:grid-cols-2">
                  {bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#5fc3a6]" />
                      {bullet}
                    </li>
                  ))}
                </ul>
                <Button asChild variant="secondary" className="mt-7 bg-[#5fc3a6] text-[#0b1f19] hover:bg-[#72d3b5]">
                  <Link to="/docs">
                    {t("developer.cta")}
                    <ArrowRight />
                  </Link>
                </Button>
              </div>

              <div className="space-y-4">
                <CodeBlock code={CURL_EXAMPLE} filename="quickstart.sh" />
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#8fb3a8]">
                    {t("developer.endpointTitle")}
                  </p>
                  <ul className="mt-3 space-y-2.5">
                    {endpoints.map((endpoint) => (
                      <li key={endpoint.path} className="flex items-center gap-3 text-xs">
                        <span
                          className={
                            endpoint.method === "GET"
                              ? "w-11 shrink-0 rounded bg-[#17352c] px-1.5 py-1 text-center font-mono text-[0.6rem] font-bold text-[#5fc3a6]"
                              : "w-11 shrink-0 rounded bg-[#3a2c14] px-1.5 py-1 text-center font-mono text-[0.6rem] font-bold text-[#f0b96e]"
                          }
                        >
                          {endpoint.method}
                        </span>
                        <code className="truncate text-[#dce9e4]">{endpoint.path}</code>
                        <span className="ml-auto hidden shrink-0 text-[#8fb3a8] sm:block">{endpoint.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="container-page py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <SectionHeading eyebrow={t("faq.eyebrow")} title={t("faq.title")} />
          </Reveal>
          <Reveal delay={0.06}>
            <Accordion type="single" collapsible className="rounded-xl border border-border bg-card px-5">
              {faq.map((item, index) => (
                <AccordionItem key={item.q} value={`item-${index}`}>
                  <AccordionTrigger>{item.q}</AccordionTrigger>
                  <AccordionContent>{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </section>

      <section className="container-page pb-24 pt-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-secondary/70 px-6 py-14 text-center sm:px-12">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(31,111,92,0.16),transparent_65%)]" />
            <div className="relative mx-auto max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{t("cta.eyebrow")}</p>
              <h2 className="display-title mt-3 text-[2.3rem] text-foreground sm:text-[3.1rem]">{t("cta.title")}</h2>
              <p className="mx-auto mt-4 max-w-xl text-[0.98rem] leading-relaxed text-muted-foreground">
                {t("cta.body")}
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Button asChild size="lg">
                  <Link to="/docs#quickstart">
                    {t("cta.primary")}
                    <ArrowRight />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/support">{t("cta.secondary")}</Link>
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
