import { ArrowUpRight, BookOpen, Boxes, Cloud, Database, HardDrive, KeyRound, Mail, ShieldCheck, TimerReset } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Seo } from "@/components/Seo";
import { CodeBlock } from "@/components/site/CodeBlock";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { apiUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

const API_BASE = apiUrl("").replace(/\/+$/, "");

const TOC = [
  { id: "quickstart", label: "Quickstart" },
  { id: "architecture", label: "Architecture" },
  { id: "auth", label: "Authentication" },
  { id: "api", label: "API reference" },
  { id: "users", label: "Users & check-ins" },
  { id: "contacts", label: "Contacts & revocation" },
  { id: "sos", label: "SOS uploads" },
  { id: "emergency", label: "Emergency page" },
  { id: "worker", label: "Hourly worker" },
  { id: "data", label: "Data model" },
  { id: "security", label: "Retention & security" },
  { id: "deploy", label: "Deploy it yourself" },
  { id: "errors", label: "Errors" },
];

const ENDPOINTS = [
  { method: "GET", path: "/health", auth: "No", note: "Service version and UTC time." },
  { method: "POST", path: "/v1/users", auth: "No", note: "Create a user; returns the API key once." },
  { method: "GET", path: "/v1/me", auth: "Yes", note: "Profile, switch state and due dates." },
  { method: "PATCH", path: "/v1/me", auth: "Yes", note: "Update name, email, phone, interval, grace, timezone." },
  { method: "DELETE", path: "/v1/me", auth: "Yes", note: "Delete the user and dependent records." },
  { method: "POST", path: "/v1/check-ins", auth: "Yes", note: "Reset the switch; optionally save a location." },
  { method: "GET", path: "/v1/check-ins", auth: "Yes", note: "Last 50 check-ins and current switch state." },
  { method: "POST", path: "/v1/locations", auth: "Yes", note: "Save one GPS point." },
  { method: "GET", path: "/v1/locations?days=7", auth: "Yes", note: "Points from the last 1–7 days." },
  { method: "GET", path: "/v1/contacts", auth: "Yes", note: "Emergency contacts and their links." },
  { method: "POST", path: "/v1/contacts", auth: "Yes", note: "Name plus email or phone." },
  { method: "PATCH", path: "/v1/contacts/:id", auth: "Yes", note: "Update a contact." },
  { method: "DELETE", path: "/v1/contacts/:id", auth: "Yes", note: "Delete a contact." },
  { method: "POST", path: "/v1/contacts/:id/revoke", auth: "Yes", note: "Kill that contact's unique link." },
  { method: "POST", path: "/v1/contacts/:id/restore", auth: "Yes", note: "Issue a new link for that contact." },
  { method: "POST", path: "/v1/sos", auth: "Yes", note: "JSON message or raw image/video/audio (25 MB)." },
  { method: "GET", path: "/v1/sos", auth: "Yes", note: "SOS history and media paths." },
  { method: "GET", path: "/v1/sos/:id/media", auth: "Yes", note: "Owner media download with range support." },
  { method: "GET", path: "/v1/emergency-link", auth: "Yes", note: "The owner's private page link." },
  { method: "POST", path: "/v1/emergency-link/rotate", auth: "Yes", note: "Rotate the owner link; optionally revoke all contacts." },
  { method: "GET", path: "/v1/emergency/:token", auth: "Token", note: "Public payload for the private page." },
  { method: "GET", path: "/v1/emergency/:token/media/:id", auth: "Token", note: "Stream SOS media from R2." },
];

const QUICKSTART = `API="${API_BASE}"

# 1. Create a user. API keys are shown once and stored only as a SHA-256 hash.
curl -X POST "$API/v1/users" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Thandi Mokoena",
    "email": "thandi@example.com",
    "phone": "+27821234567",
    "check_in_interval_minutes": 1440,
    "grace_minutes": 60,
    "timezone": "Africa/Johannesburg"
  }'

# 2. Keep the returned api_key.
export KEY="ts_live_..."

# 3. Check in. This resets the switch and clears an active emergency.
curl -X POST "$API/v1/check-ins" \\
  -H "Authorization: Bearer $KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"note":"Arrived at the trailhead","location":{"latitude":-33.9249,"longitude":18.4241}}'`;

const AUTH_EXAMPLE = `# Every owner endpoint uses a Bearer token.
curl "$API/v1/me" -H "Authorization: Bearer $KEY"

# Errors share one envelope:
{
  "error": {
    "code": "validation_failed",
    "message": "Add an email address or a phone number so we can reach this contact.",
    "field": "email"
  }
}`;

const USER_EXAMPLE = `# Update the profile. Send 0 as the interval to disable the switch.
curl -X PATCH "$API/v1/me" \\
  -H "Authorization: Bearer $KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Thandi M.","check_in_interval_minutes":720,"grace_minutes":30}'

# Save a GPS point (recorded_at is optional and defaults to now).
curl -X POST "$API/v1/locations" \\
  -H "Authorization: Bearer $KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"latitude":-33.9249,"longitude":18.4241,"accuracy_m":12}'`;

const CONTACT_EXAMPLE = `# A contact needs a name and at least one of email or phone.
curl -X POST "$API/v1/contacts" \\
  -H "Authorization: Bearer $KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Sipho Dlamini","email":"sipho@example.com","phone":"+27829876543"}'

# Revoke one contact's link without affecting anyone else.
curl -X POST "$API/v1/contacts/$CONTACT_ID/revoke" \\
  -H "Authorization: Bearer $KEY"

# Rotate your own link and revoke every contact link at once.
curl -X POST "$API/v1/emergency-link/rotate" \\
  -H "Authorization: Bearer $KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"revoke_contacts":true}'`;

const SOS_MESSAGE = `curl -X POST "$API/v1/sos" \\
  -H "Authorization: Bearer $KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"message":"Trail flooded. I am heading back to the car park."}'`;

const SOS_MEDIA = `# The Content-Type decides the kind. Limit: 25 MB.
curl -X POST "$API/v1/sos" \\
  -H "Authorization: Bearer $KEY" \\
  -H "Content-Type: video/mp4" \\
  -H "X-TravelSafe-Message: Steep drop, cannot continue" \\
  --data-binary @sos.mp4

# image/jpeg, image/png, audio/mpeg, audio/mp4, video/webm and friends work too.
curl -X POST "$API/v1/sos" \\
  -H "Authorization: Bearer $KEY" \\
  -H "Content-Type: audio/mpeg" \\
  --data-binary @sos.mp3`;

const EMERGENCY_EXAMPLE = `# The page calls this endpoint with the token from the URL.
curl "$API/v1/emergency/$TOKEN"

# Response (abridged):
{
  "viewer": { "kind": "contact", "name": "Sipho Dlamini" },
  "person": { "name": "Thandi Mokoena" },
  "status": { "active": true, "reason": "deadman", "since": "2026-11-23T09:00:00Z" },
  "locations": [ { "latitude": -33.9249, "longitude": 18.4241, "recorded_at": "..." } ],
  "sos": [ { "id": "...", "kind": "video", "media_path": "/v1/emergency/$TOKEN/media/..." } ],
  "retention_days": 7,
  "generated_at": "..."
}`;

const WORKER_EXAMPLE = `# The worker uses the same D1 database. Run it manually while developing:
curl -X POST "https://travel-safe-worker.seni-tembe.workers.dev/run" \\
  -H "Authorization: Bearer $CRON_SECRET"`;

export function DocsPage() {
  const { t } = useTranslation();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: t("seo.docs.title"),
    description: t("seo.docs.description"),
    about: ["Cloudflare Workers", "Cloudflare D1", "Cloudflare R2", "Go", "dead-man switch"],
    author: { "@type": "Organization", name: "The Makers" },
  };

  return (
    <>
      <Seo title={t("seo.docs.title")} description={t("seo.docs.description")} path="/docs" jsonLd={jsonLd} />

      <section className="border-b border-border mesh-glow">
        <div className="container-page py-14 sm:py-20">
          <Badge variant="outline" className="gap-1.5 border-primary/25 bg-card/70">
            <BookOpen className="size-3.5 text-primary" />
            Documentation · v1.0.0
          </Badge>
          <h1 className="display-title mt-5 max-w-3xl text-[2.7rem] sm:text-[4rem]">Build on Travel Safe.</h1>
          <p className="mt-4 max-w-2xl text-[1rem] leading-relaxed text-muted-foreground">
            A Go API on Cloudflare Workers, D1 for structured data, R2 for SOS media, and an hourly
            TypeScript worker that owns the dead-man switch.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {["Go → WebAssembly", "Cloudflare D1", "Cloudflare R2", "Hourly cron", "React viewer"].map((item) => (
              <Badge key={item} variant="secondary" className="rounded-md px-2.5 py-1 text-[0.68rem]">
                {item}
              </Badge>
            ))}
          </div>
          <div className="mt-8 rounded-xl border border-border bg-card/80 p-4 text-xs text-muted-foreground backdrop-blur">
            <span className="font-bold text-foreground">Base URL</span>{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">{API_BASE}</code>
            <span className="ml-2">The docs are currently written in English.</span>
          </div>
        </div>
      </section>

      <div className="container-page grid gap-12 py-12 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <nav className="sticky top-24" aria-label="Documentation">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">On this page</p>
            <ul className="mt-3 space-y-1 border-l border-border">
              {TOC.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="-ml-px block border-l border-transparent py-1.5 pl-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <article className="min-w-0">
          <DocSection id="quickstart" title="Quickstart">
            <p>
              Every account starts with a name. Everything else is optional. If you leave out
              <code> check_in_interval_minutes</code>, the account starts with a 24-hour cycle. Send
              <code> 0</code> to disable the switch.
            </p>
            <CodeBlock code={QUICKSTART} filename="quickstart.sh" />
            <p className="text-xs">
              The API key is returned once. Store it in a secret manager. Travel Safe keeps only a
              SHA-256 hash, so a lost key cannot be recovered — create a new account or rotate from
              your own client.
            </p>
          </DocSection>

          <DocSection id="architecture" title="Architecture">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  icon: Cloud,
                  title: "Go API Worker",
                  body: "Compiled with GOOS=js GOARCH=wasm and served by workers-go. Handles auth, validation, D1 queries and R2 uploads.",
                },
                {
                  icon: TimerReset,
                  title: "Hourly worker",
                  body: "TypeScript cron at 0 * * * *. Warns users, triggers the switch, emails contacts and cleans up old rows.",
                },
                {
                  icon: Database,
                  title: "Cloudflare D1",
                  body: "Users, contacts, locations, check-ins, SOS metadata, emergency events and notification dedupe.",
                },
                {
                  icon: HardDrive,
                  title: "Cloudflare R2",
                  body: "Private SOS media. Only streamed through token-checked API routes; the bucket is never public.",
                },
              ].map((item) => (
                <Card key={item.title} className="gap-3 p-5 shadow-none">
                  <span className="grid size-9 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                    <item.icon className="size-4" />
                  </span>
                  <h3 className="text-sm font-bold">{item.title}</h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">{item.body}</p>
                </Card>
              ))}
            </div>
            <p>
              The browser never talks to D1 or R2 directly. The React emergency page calls
              <code> GET /v1/emergency/:token</code>, and media requests go through
              <code> GET /v1/emergency/:token/media/:id</code>. A revoked token immediately stops both.
            </p>
          </DocSection>

          <DocSection id="auth" title="Authentication">
            <p>
              Owner endpoints use <code>Authorization: Bearer &lt;api_key&gt;</code> (or
              <code> X-API-Key</code>). Public emergency endpoints use the unguessable token in the
              path. There are no cookies and no sessions to expire.
            </p>
            <CodeBlock code={AUTH_EXAMPLE} filename="auth.sh" />
          </DocSection>

          <DocSection id="api" title="API reference">
            <p>
              All request and response bodies are JSON unless you are uploading SOS media. Timestamps
              are RFC 3339 in UTC, e.g. <code>2026-11-23T09:00:00Z</code>.
            </p>
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full min-w-[640px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/60">
                    <th className="px-3 py-2.5 font-bold">Method</th>
                    <th className="px-3 py-2.5 font-bold">Path</th>
                    <th className="px-3 py-2.5 font-bold">Auth</th>
                    <th className="px-3 py-2.5 font-bold">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {ENDPOINTS.map((endpoint) => (
                    <tr key={`${endpoint.method}-${endpoint.path}`} className="border-b border-border/70 last:border-0">
                      <td className="px-3 py-2.5">
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 font-mono text-[0.62rem] font-bold",
                            endpoint.method === "GET"
                              ? "bg-secondary text-secondary-foreground"
                              : "bg-warning-background text-warning",
                          )}
                        >
                          {endpoint.method}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[0.7rem] text-foreground">{endpoint.path}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{endpoint.auth}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{endpoint.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DocSection>

          <DocSection id="users" title="Users & check-ins">
            <p>
              <code>PATCH /v1/me</code> is partial: omitted fields stay unchanged, and sending an empty
              string clears an optional email or phone. The check-in interval is stored in minutes.
              <code> check_in_due_at</code> and <code>trigger_due_at</code> in the response are derived,
              not stored.
            </p>
            <CodeBlock code={USER_EXAMPLE} filename="users.sh" />
          </DocSection>

          <DocSection id="contacts" title="Contacts & revocation">
            <p>
              A contact must have a name and at least one reachable channel. Name-only contacts are
              rejected with a field-level validation error. Every contact receives their own private
              token, so revoking one does not affect the others.
            </p>
            <CodeBlock code={CONTACT_EXAMPLE} filename="contacts.sh" />
            <p>
              <code>POST /v1/emergency-link/rotate</code> replaces the owner token. Old owner links stop
              working immediately. Set <code>revoke_contacts: true</code> to clear every contact token in
              the same request.
            </p>
          </DocSection>

          <DocSection id="sos" title="SOS uploads">
            <p>
              An SOS immediately marks the account as triggered and creates an active emergency event.
              The next hourly run notifies the owner and every contact that has an email address. Media
              is private in R2 and limited to 25 MB.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">Custom message</p>
                <CodeBlock code={SOS_MESSAGE} filename="sos-message.sh" />
              </div>
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">Media upload</p>
                <CodeBlock code={SOS_MEDIA} filename="sos-media.sh" />
              </div>
            </div>
            <ul>
              <li><strong>Message:</strong> <code>application/json</code> with <code>{`{"message":"..."}`}</code>, or <code>text/plain</code>.</li>
              <li><strong>Image:</strong> any <code>image/*</code> content type.</li>
              <li><strong>Video:</strong> any <code>video/*</code> content type.</li>
              <li><strong>Audio:</strong> any <code>audio/*</code> content type.</li>
              <li><strong>Caption:</strong> optional <code>X-TravelSafe-Message</code> header on media.</li>
            </ul>
          </DocSection>

          <DocSection id="emergency" title="Emergency page">
            <p>
              Tokens are bearer capabilities: anyone with the link can see the page. Treat them like a
              password. The page is marked <code>noindex, nofollow</code> and never lists contacts or
              account contact details.
            </p>
            <CodeBlock code={EMERGENCY_EXAMPLE} filename="emergency.sh" />
            <p>
              The React viewer at <code>/emergency/:token</code> renders the latest location, a
              dependency-free SVG trail, an accuracy figure, and every SOS item with native video,
              audio or image playback. The exact route pattern is
              <code> /emergency/&lt;token&gt;</code>.
            </p>
          </DocSection>

          <DocSection id="worker" title="Hourly worker">
            <p>
              The cron runs at <code>0 * * * *</code>. For each user with an interval and no active
              trigger, it compares <code>last_check_in_at</code> to the deadline:
            </p>
            <ol>
              <li>
                <strong>Warning:</strong> once the deadline passes, send one warning email per check-in
                cycle and record <code>warning_sent_for</code>.
              </li>
              <li>
                <strong>Dead-man switch:</strong> after <code>grace_minutes</code>, create an emergency
                event, mark the user triggered, and email the owner plus contacts who have an email.
              </li>
              <li>
                <strong>Dedupe:</strong> notification rows are unique per user, contact, kind and cycle,
                so a retry after a provider error does not spam anyone who already received the alert.
              </li>
              <li>
                <strong>Cleanup:</strong> locations older than 7 days are deleted. Check-ins, resolved
                events and notification logs are pruned on a 90-day window.
              </li>
            </ol>
            <CodeBlock code={WORKER_EXAMPLE} filename="worker.sh" />
            <p className="flex items-start gap-2">
              <Mail className="mt-0.5 size-4 shrink-0 text-primary" />
              Configure <code>RESEND_API_KEY</code> for Resend, or add a Cloudflare
              <code> send_email</code> binding named <code>EMAIL</code>. Set <code>EMAIL_FROM</code> to an
              address on an onboarded sending domain. Without a provider the worker logs a clear error
              and retries on the next run.
            </p>
            <p>
              Optional <code>PUSH_WEBHOOK_URL</code> receives a JSON POST for each emergency. Point it at
              an ntfy-style topic or your own push gateway. A successful webhook is deduped just like
              email.
            </p>
          </DocSection>

          <DocSection id="data" title="Data model">
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                ["users", "Name, contact details, API key hash, interval, grace, token, switch state."],
                ["contacts", "Name, email, phone, unique access token, revocation timestamp."],
                ["locations", "Latitude, longitude, accuracy and recorded_at. Deleted after 7 days."],
                ["check_ins", "Audit trail of check-in timestamps and optional notes."],
                ["sos_events", "Kind, message, R2 key, content type and size."],
                ["emergency_events", "deadman or sos, created_at, resolved_at, first_notified_at."],
                ["notifications", "Dedupe ledger for sent, skipped and failed alerts."],
              ].map(([name, body]) => (
                <div key={name} className="rounded-lg border border-border bg-card p-3.5">
                  <code className="text-xs font-bold text-primary">{name}</code>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </DocSection>

          <DocSection id="security" title="Retention & security">
            <ul>
              <li>API keys are stored only as SHA-256 hashes and are shown once.</li>
              <li>Emergency and contact tokens are random 256-bit values, not guessable IDs.</li>
              <li>Location history is retained for 7 days and queried only within that window.</li>
              <li>SOS media lives in a private R2 bucket and is served through a token check with <code>Cache-Control: private, no-store</code>.</li>
              <li>Revoking or rotating a token invalidates old links immediately, including media URLs.</li>
              <li>CORS is restricted to <code>WEB_ORIGIN</code> in production.</li>
            </ul>
            <p>
              Travel Safe is not a replacement for emergency services. It notifies the people you chose
              and cannot guarantee delivery, attention or action.
            </p>
          </DocSection>

          <DocSection id="deploy" title="Deploy it yourself">
            <p>
              The repository contains three deployable pieces: the Go API worker, the cron worker and the
              React site. The D1 migration lives in <code>db/migrations/0001_init.sql</code>.
            </p>
            <CodeBlock
              filename="deploy.sh"
              code={`# Install JavaScript dependencies and Wrangler
npm install

# Create the database and bucket
npx wrangler d1 create travel-safe-db
npx wrangler r2 bucket create travel-safe-media

# Put the database id into api/wrangler.jsonc and apps/worker/wrangler.jsonc
npx wrangler d1 migrations apply travel-safe-db --remote

# Deploy API, then the cron worker
npm run deploy:api
npm run deploy:worker

# Build the site with the real API and page URLs
VITE_API_URL="https://travel-safe-api.<subdomain>.workers.dev" \\
VITE_SITE_URL="https://travel-safe-web.<subdomain>.workers.dev" \\
npm run deploy:web`}
            />
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Environment</p>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="px-3 py-2.5 font-bold">Variable</th>
                    <th className="px-3 py-2.5 font-bold">Where</th>
                    <th className="px-3 py-2.5 font-bold">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["WEB_ORIGIN", "API", "Comma-separated site origins allowed by CORS."],
                    ["EMERGENCY_BASE_URL", "API", "Base URL used to build private page links."],
                    ["WEB_BASE_URL", "Worker", "Site URL used in emails and push payloads."],
                    ["EMAIL_FROM", "Worker", "From address on an onboarded sending domain."],
                    ["RESEND_API_KEY", "Worker secret", "Resend API key. Optional if EMAIL binding is set."],
                    ["PUSH_WEBHOOK_URL", "Worker", "Optional JSON webhook for push-style alerts."],
                    ["CRON_SECRET", "Worker secret", "Bearer secret for POST /run, the manual trigger."],
                    ["VITE_API_URL", "Web build", "Full API base URL used by the browser."],
                    ["VITE_SITE_URL", "Web build", "Canonical site URL for metadata."],
                  ].map(([name, where, purpose]) => (
                    <tr key={name} className="border-t border-border">
                      <td className="px-3 py-2.5 font-mono text-[0.7rem]">{name}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{where}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href="https://github.com/mindsgn/travel-safe"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
              >
                Source on GitHub <ArrowUpRight className="size-4" />
              </a>
              <a
                href="/llms.txt"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
              >
                llms.txt <ArrowUpRight className="size-4" />
              </a>
            </div>
          </DocSection>

          <DocSection id="errors" title="Errors">
            <p>
              Every failure uses the same envelope: <code>{`{"error":{"code","message","field"}}`}</code>.
              Validation failures return <code>422</code> with a <code>field</code> you can highlight.
              Missing or invalid keys return <code>401</code>. Invalid or revoked emergency tokens
              return <code>404</code> with <code>emergency_link_invalid</code>.
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                ["401", "unauthorized"],
                ["404", "not_found / emergency_link_invalid"],
                ["413", "file_too_large"],
                ["415", "unsupported_media_type"],
                ["422", "validation_failed"],
                ["500", "internal_error"],
              ].map(([status, code]) => (
                <div key={status} className="rounded-lg border border-border bg-card px-3 py-2.5">
                  <span className="font-mono text-xs font-bold text-primary">{status}</span>
                  <p className="mt-1 font-mono text-[0.65rem] text-muted-foreground">{code}</p>
                </div>
              ))}
            </div>
          </DocSection>

          <div className="mt-12 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-5">
            <ShieldCheck className="size-5 text-primary" />
            <p className="text-sm text-muted-foreground">
              Need help? <a className="font-bold text-primary hover:underline" href="/support">Open the support page</a>.
            </p>
            <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              <KeyRound className="size-3.5" /> v1.0.0
              <Boxes className="size-3.5" /> Cloudflare Workers
            </span>
          </div>
        </article>
      </div>
    </>
  );
}

function DocSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-border py-9 first:pt-0 last:border-0">
      <h2 className="display-title text-[1.8rem] text-foreground sm:text-[2.1rem]">{title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.82em] [&_code]:text-foreground [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}
