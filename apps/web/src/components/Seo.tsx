import { useEffect } from "react";
import { useTranslation } from "react-i18next";

interface SeoProps {
  title: string;
  description: string;
  path?: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const SITE_URL = (import.meta.env.VITE_SITE_URL || "https://travel-safe-web.seni-tembe.workers.dev").replace(/\/+$/, "");

function upsertMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value);
  }
}

function upsertLink(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector<HTMLLinkElement>(selector);
  if (!element) {
    element = document.createElement("link");
    document.head.appendChild(element);
  }
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value);
  }
}

export function Seo({ title, description, path = "/", noindex = false, jsonLd }: SeoProps) {
  const { i18n } = useTranslation();
  const locale = i18n.language || "en";
  const url = `${SITE_URL}${path}`;

  useEffect(() => {
    document.title = title;
    document.documentElement.lang = locale;

    upsertMeta('meta[name="description"]', { name: "description", content: description });
    upsertMeta('meta[name="robots"]', {
      name: "robots",
      content: noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large",
    });
    upsertMeta('meta[property="og:title"]', { property: "og:title", content: title });
    upsertMeta('meta[property="og:description"]', { property: "og:description", content: description });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: url });
    upsertMeta('meta[property="og:locale"]', { property: "og:locale", content: locale });
    upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: title });
    upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: description });
    upsertMeta('meta[name="twitter:url"]', { name: "twitter:url", content: url });
    upsertLink('link[rel="canonical"]', { rel: "canonical", href: url });

    const scriptId = "travel-safe-page-json-ld";
    document.getElementById(scriptId)?.remove();
    if (jsonLd) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
  }, [title, description, path, noindex, jsonLd, locale, url]);

  return null;
}
