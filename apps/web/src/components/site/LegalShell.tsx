import type { ReactNode } from "react";
import { Scale } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export function LegalShell({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <>
      <section className="border-b border-border bg-card/40">
        <div className="container-page py-12 sm:py-16">
          <Badge variant="outline" className="gap-1.5 border-primary/25 bg-card/70">
            <Scale className="size-3.5 text-primary" />
            {eyebrow}
          </Badge>
          <h1 className="display-title mt-5 text-[2.5rem] sm:text-[3.6rem]">{title}</h1>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{updated}</p>
        </div>
      </section>
      <section className="container-page grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_280px]">
        <article className="prose-legal max-w-3xl">{children}</article>
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-xl border border-border bg-card p-5 text-xs leading-relaxed text-muted-foreground">
            <p className="font-bold text-foreground">A safety net, not an emergency service.</p>
            <p className="mt-2">
              If you or someone else is in immediate danger, contact local emergency services. Travel
              Safe cannot dispatch help.
            </p>
            <a
              className="mt-4 inline-block font-bold text-primary hover:underline"
              href="https://github.com/mindsgn/travel-safe/issues"
              target="_blank"
              rel="noreferrer"
            >
              Contact the project →
            </a>
          </div>
        </aside>
      </section>
    </>
  );
}
