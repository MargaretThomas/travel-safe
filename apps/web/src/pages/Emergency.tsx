import {
  AlertTriangle,
  ArrowLeft,
  Clock3,
  ExternalLink,
  Image as ImageIcon,
  MapPin,
  MapPinOff,
  MessageSquare,
  Music2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Users,
  Video,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { Seo } from "@/components/Seo";
import { EmergencyLayout } from "@/components/site/EmergencyLayout";
import { TrailMap } from "@/components/site/TrailMap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, apiUrl, getEmergency, type EmergencyPayload, type EmergencySOS } from "@/lib/api";
import { formatCoords, formatDate, mapsUrl } from "@/lib/utils";

type ViewState =
  | { phase: "loading" }
  | { phase: "ready"; data: EmergencyPayload }
  | { phase: "error"; notFound: boolean };

export function EmergencyPage() {
  const { token } = useParams<{ token: string }>();
  const { t, i18n } = useTranslation();
  const [state, setState] = useState<ViewState>({ phase: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!token) {
      setState({ phase: "error", notFound: true });
      return;
    }
    const controller = new AbortController();
    setState({ phase: "loading" });
    getEmergency(token, controller.signal)
      .then((data) => setState({ phase: "ready", data }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        const notFound = error instanceof ApiError && (error.status === 404 || error.status === 410);
        setState({ phase: "error", notFound });
      });
    return () => controller.abort();
  }, [token, reloadKey]);

  const jsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Travel Safe emergency view",
      isFamilyFriendly: true,
    }),
    [],
  );

  if (state.phase === "loading") {
    return (
      <EmergencyLayout>
        <Seo title="Emergency view — Travel Safe" description={t("emergency.badge")} path={`/emergency/${token ?? ""}`} noindex jsonLd={jsonLd} />
        <div className="container-page max-w-4xl py-12">
          <p className="text-sm font-semibold text-muted-foreground">{t("emergency.loading")}</p>
          <Skeleton className="mt-5 h-36 w-full rounded-2xl" />
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-56 rounded-2xl sm:col-span-2" />
            <Skeleton className="h-56 rounded-2xl" />
          </div>
          <Skeleton className="mt-4 h-64 w-full rounded-2xl" />
        </div>
      </EmergencyLayout>
    );
  }

  if (state.phase === "error") {
    return (
      <EmergencyLayout>
        <Seo title="Emergency link — Travel Safe" description={t("emergency.invalidBody")} path={`/emergency/${token ?? ""}`} noindex />
        <div className="container-page flex min-h-[60vh] max-w-2xl flex-col items-center justify-center py-16 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-danger-background text-danger">
            <ShieldAlert className="size-7" />
          </span>
          <h1 className="display-title mt-5 text-4xl">{t("emergency.invalidTitle")}</h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">{t("emergency.invalidBody")}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button onClick={() => setReloadKey((value) => value + 1)}>
              <RefreshCw />
              {t("common.retry")}
            </Button>
            <Button asChild variant="outline">
              <Link to="/">
                <ArrowLeft />
                {t("common.backHome")}
              </Link>
            </Button>
          </div>
        </div>
      </EmergencyLayout>
    );
  }

  const { data } = state;
  const latest = data.locations[0];
  const chronological = [...data.locations].reverse();
  const isActive = data.status.active;
  const reason =
    data.status.reason === "sos"
      ? t("emergency.reasonSos")
      : data.status.reason === "deadman"
        ? t("emergency.reasonDeadman")
        : null;

  return (
    <EmergencyLayout>
      <Seo
        title="Emergency view — Travel Safe"
        description={`${t("emergency.badge")}: ${data.person.name}`}
        path={`/emergency/${token ?? ""}`}
        noindex
        jsonLd={jsonLd}
      />
      <div className="container-page max-w-5xl py-8 sm:py-12">
        {data.viewer.kind === "contact" && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-primary/20 bg-secondary/60 px-4 py-3 text-sm">
            <Users className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="font-semibold text-secondary-foreground">{t("emergency.viewingAsContact")}</p>
          </div>
        )}

        <Card className="gap-0 overflow-hidden p-0">
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-7">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary text-lg font-extrabold text-primary-foreground">
              {initials(data.person.name)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-primary/20 bg-secondary/60 text-secondary-foreground">
                  {data.viewer.kind === "owner" ? t("emergency.viewingAsOwner") : t("emergency.badge")}
                </Badge>
                {isActive ? (
                  <Badge variant="danger" className="gap-1.5">
                    <span className="relative flex size-1.5">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-danger opacity-70" />
                      <span className="relative inline-flex size-1.5 rounded-full bg-danger" />
                    </span>
                    {t("emergency.active")}
                  </Badge>
                ) : (
                  <Badge variant="success">{t("emergency.inactive")}</Badge>
                )}
              </div>
              <h1 className="display-title mt-3 text-3xl sm:text-4xl">{data.person.name}</h1>
              {reason && (
                <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                  <span>{reason}</span>
                  {data.status.since && (
                    <span className="inline-flex items-center gap-1 text-xs">
                      <Clock3 className="size-3.5" />
                      {t("emergency.since", { when: formatDate(data.status.since, i18n.language) })}
                    </span>
                  )}
                </p>
              )}
            </div>
            <div className="text-left sm:text-right">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {t("emergency.updated", { when: formatDate(data.generated_at, i18n.language) })}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("emergency.trailCount", { count: data.locations.length })}
              </p>
            </div>
          </div>
        </Card>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.55fr_1fr]">
          <Card className="gap-0 overflow-hidden p-0">
            <div className="relative h-60 border-b border-border sm:h-72">
              {latest ? (
                <TrailMap points={chronological} label={t("emergency.mapAlt")} />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 bg-muted/40 text-muted-foreground">
                  <MapPinOff className="size-7" />
                  <p className="text-sm font-semibold">{t("emergency.trailEmpty")}</p>
                </div>
              )}
              {latest && (
                <div className="absolute left-3 top-3 rounded-full border border-border bg-card/95 px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-muted-foreground backdrop-blur">
                  {t("emergency.trail")}
                </div>
              )}
            </div>
            <div className="p-5">
              {latest ? (
                <>
                  <p className="flex items-center gap-1.5 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-primary">
                    <MapPin className="size-3.5" />
                    {t("emergency.lastKnown")}
                  </p>
                  <p className="mt-2 font-mono text-lg font-bold tracking-tight">
                    {formatCoords(latest.latitude, latest.longitude)}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{t("emergency.lastKnownAt", { when: formatDate(latest.recorded_at, i18n.language) })}</span>
                    {latest.accuracy_m != null && (
                      <span>{t("emergency.accuracy", { metres: Math.round(latest.accuracy_m) })}</span>
                    )}
                  </div>
                  <Button asChild variant="outline" size="sm" className="mt-4 w-fit">
                    <a href={mapsUrl(latest.latitude, latest.longitude)} target="_blank" rel="noreferrer">
                      <ExternalLink />
                      {t("common.openInMaps")}
                    </a>
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{t("emergency.trailEmpty")}</p>
              )}
            </div>
          </Card>

          <div className="grid gap-4">
            <Card className={isActive ? "border-danger/25 bg-danger-background/45 p-5" : "p-5"}>
              <span
                className={
                  isActive
                    ? "grid size-10 place-items-center rounded-lg bg-danger-background text-danger"
                    : "grid size-10 place-items-center rounded-lg bg-secondary text-secondary-foreground"
                }
              >
                {isActive ? <AlertTriangle className="size-5" /> : <ShieldCheck className="size-5" />}
              </span>
              <h2 className="mt-3 text-sm font-extrabold">{isActive ? t("emergency.active") : t("emergency.inactive")}</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {reason ?? t("emergency.inactive")}
              </p>
              {data.status.since && (
                <p className="mt-3 border-t border-border/70 pt-3 text-[0.68rem] text-muted-foreground">
                  {t("emergency.since", { when: formatDate(data.status.since, i18n.language) })}
                </p>
              )}
            </Card>

            <Card className="p-5">
              <h2 className="flex items-center gap-2 text-sm font-extrabold">
                <ShieldAlert className="size-4 text-primary" />
                {t("emergency.supportTitle")}
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t("emergency.supportBody")}</p>
            </Card>
          </div>
        </div>

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <h2 className="display-title text-2xl sm:text-3xl">{t("emergency.sos")}</h2>
            <Badge variant="outline">{data.sos.length}</Badge>
          </div>
          {data.sos.length === 0 ? (
            <Card className="mt-4 items-center justify-center gap-2 p-10 text-center">
              <ShieldCheck className="size-7 text-primary" />
              <p className="text-sm font-semibold">{t("emergency.sosEmpty")}</p>
            </Card>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {data.sos.map((item) => (
                <SosCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <h2 className="display-title text-2xl sm:text-3xl">{t("emergency.trail")}</h2>
            <Badge variant="outline">{data.locations.length}</Badge>
          </div>
          {data.locations.length === 0 ? (
            <Card className="mt-4 items-center justify-center gap-2 p-10 text-center">
              <MapPinOff className="size-7 text-muted-foreground" />
              <p className="text-sm font-semibold">{t("emergency.trailEmpty")}</p>
            </Card>
          ) : (
            <Card className="mt-4 gap-0 overflow-hidden p-0">
              <ul className="max-h-[420px] divide-y divide-border overflow-y-auto">
                {data.locations.map((location, index) => (
                  <li key={location.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-xs">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-secondary font-mono text-[0.6rem] font-bold text-secondary-foreground">
                      {data.locations.length - index}
                    </span>
                    <span className="font-mono font-semibold text-foreground">
                      {formatCoords(location.latitude, location.longitude)}
                    </span>
                    {location.accuracy_m != null && (
                      <span className="text-muted-foreground">±{Math.round(location.accuracy_m)} m</span>
                    )}
                    <span className="text-muted-foreground">{formatDate(location.recorded_at, i18n.language)}</span>
                    <a
                      className="ml-auto inline-flex items-center gap-1 font-bold text-primary hover:underline"
                      href={mapsUrl(location.latitude, location.longitude)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MapPin className="size-3" />
                      {t("common.openInMaps")}
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>

        <p className="mt-8 rounded-xl border border-border bg-card px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          {t("emergency.footer")}
        </p>
      </div>
    </EmergencyLayout>
  );
}

function SosCard({ item }: { item: EmergencySOS }) {
  const { t, i18n } = useTranslation();
  const src = item.media_path ? apiUrl(item.media_path) : undefined;
  const icon = item.kind === "video" ? Video : item.kind === "audio" ? Music2 : item.kind === "image" ? ImageIcon : MessageSquare;
  const Icon = icon;
  const label =
    item.kind === "video"
      ? t("emergency.video")
      : item.kind === "audio"
        ? t("emergency.audio")
        : item.kind === "image"
          ? t("emergency.image")
          : t("emergency.message");

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="flex items-center gap-2.5 border-b border-border bg-muted/30 px-4 py-2.5">
        <span className="grid size-7 place-items-center rounded-md bg-secondary text-secondary-foreground">
          <Icon className="size-3.5" />
        </span>
        <p className="text-xs font-extrabold">{label}</p>
        <p className="ml-auto text-[0.65rem] text-muted-foreground">
          {t("emergency.sentAt", { when: formatDate(item.created_at, i18n.language) })}
        </p>
      </div>

      {item.kind === "video" && src && (
        <video controls playsInline preload="metadata" className="aspect-video w-full bg-black" src={src}>
          <track kind="captions" />
        </video>
      )}
      {item.kind === "image" && src && (
        <a href={src} target="_blank" rel="noreferrer" className="block bg-muted/30">
          <img src={src} alt={t("emergency.image")} loading="lazy" className="max-h-[420px] w-full object-contain" />
        </a>
      )}
      {item.kind === "audio" && src && (
        <div className="bg-muted/20 p-4">
          <audio controls preload="metadata" className="w-full" src={src} />
        </div>
      )}
      {item.message && (
        <p className="whitespace-pre-wrap break-words p-4 text-sm leading-relaxed text-foreground">{item.message}</p>
      )}
    </Card>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
