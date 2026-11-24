# Travel Safe

A safety net that checks on you. Check in on a schedule you choose. If you miss one, the people you trust get a private page with your last known location, the last 7 days of your route, and any SOS video, audio, image or message you sent.

Travel Safe is **not** an emergency service. It notifies the people you choose; it does not contact police, ambulance or fire services.

- **Web:** React, Vite, Tailwind CSS, shadcn/ui and ReactBits
- **API:** Go compiled to WebAssembly, running on Cloudflare Workers
- **Data:** Cloudflare D1 for relational data, R2 for SOS media
- **Scheduler:** a TypeScript Cloudflare Worker on an hourly cron (`0 * * * *`)

## Live deployment

| Service | URL |
| --- | --- |
| Landing page, docs and emergency viewer | https://travel-safe-web.seni-tembe.workers.dev |
| Go API | https://travel-safe-api.seni-tembe.workers.dev |
| Hourly switch worker | https://travel-safe-worker.seni-tembe.workers.dev |

The D1 database is `travel-safe-db` and the private media bucket is `travel-safe-media` (account `e68c968407d6d5ac0c9b32e8fdec1f01`).

Email delivery is the only part that needs credentials. Set `RESEND_API_KEY` (or bind Cloudflare Email Service as `EMAIL`) and an `EMAIL_FROM` address on a verified sending domain, then redeploy the worker. Until then the switch still warns and triggers, logs the notification, and the emergency pages work; only the outbound email is skipped.

## Repository layout

```
api/                 Go API worker (D1 + R2)
  internal/api/      HTTP routes, auth, emergency viewer, media ranges
  internal/store/    D1 queries
  internal/validate/ Input validation
apps/worker/         Hourly dead-man switch worker
apps/web/            React site, docs, legal pages and emergency viewer
db/migrations/       D1 schema shared by the API and the worker
```

## Quickstart

Requirements: Node 22+, Go 1.25+, and a Cloudflare account.

```bash
npm install

# Create the database and bucket
npx wrangler d1 create travel-safe-db
npx wrangler r2 bucket create travel-safe-media

# Put the returned database_id into api/wrangler.jsonc and apps/worker/wrangler.jsonc
npx wrangler d1 migrations apply travel-safe-db --remote

npm run deploy:api
npm run deploy:worker

VITE_API_URL="https://travel-safe-api.<subdomain>.workers.dev" \
VITE_SITE_URL="https://travel-safe-web.<subdomain>.workers.dev" \
npm run deploy:web
```

Local development:

```bash
npm run dev:api      # wrangler dev on :8787
npm run dev:worker   # wrangler dev with the cron worker
npm run dev:web      # vite on :5173, proxying /api to :8787
```

The API’s migration path is relative to each Wrangler config, so both configs point at `db/migrations`.

## API in one minute

Create an account. A name is required; email, phone, interval, grace period and timezone are optional. The API key is returned once and stored only as a SHA-256 hash.

```bash
curl -X POST "$API/v1/users" \
  -H "Content-Type: application/json" \
  -d '{"name":"Thandi Mokoena","email":"thandi@example.com","check_in_interval_minutes":1440}'
```

Then:

```bash
# Reset the dead-man switch; optionally attach a GPS point
curl -X POST "$API/v1/check-ins" \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"location":{"latitude":-33.9249,"longitude":18.4241}}'

# Save a location
curl -X POST "$API/v1/locations" \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"latitude":-33.9249,"longitude":18.4241,"accuracy_m":12}'

# Add a contact. Name + at least one of email or phone.
curl -X POST "$API/v1/contacts" \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"Sipho Dlamini","email":"sipho@example.com"}'

# Send an SOS message
curl -X POST "$API/v1/sos" \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"message":"Trail flooded. Heading back to the car park."}'

# Or upload up to 25 MB of media
curl -X POST "$API/v1/sos" \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: video/mp4" \
  --data-binary @sos.mp4
```

Every contact has a unique, revocable link. Rotating the owner link invalidates every previous copy.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/v1/users` | Create an account; returns the API key once |
| `GET/PATCH/DELETE` | `/v1/me` | Read, update or delete the account |
| `POST` | `/v1/check-ins` | Reset the switch, resolve an emergency, optionally save GPS |
| `POST` | `/v1/locations` | Save a GPS point (retained 7 days) |
| `GET/POST` | `/v1/contacts` | List or add emergency contacts |
| `PATCH/DELETE` | `/v1/contacts/:id` | Update or delete a contact |
| `POST` | `/v1/contacts/:id/revoke` | Revoke one contact’s link |
| `POST` | `/v1/contacts/:id/restore` | Issue a new link for that contact |
| `POST` | `/v1/sos` | SOS message or media upload |
| `GET` | `/v1/emergency/:token` | Public payload for the private emergency page |
| `GET` | `/v1/emergency/:token/media/:id` | Token-checked SOS media from R2 |

Full documentation is served at `/docs`.

## The hourly worker

At the top of every hour the worker:

1. Deletes location points older than 7 days.
2. Loads users whose last check-in could be overdue and decides `warn`, `trigger` or nothing.
3. Sends one warning per check-in cycle after the deadline.
4. Creates an emergency event after the grace period, marks the user triggered, and emails the owner plus every contact with an email.
5. Retries events that have not been fully notified, deduplicating per user, contact, kind and cycle.
6. Prunes check-ins, resolved events and notification logs after 90 days.

Email delivery uses Resend when `RESEND_API_KEY` is set, otherwise a Cloudflare `send_email` binding named `EMAIL`. `EMAIL_FROM` must be an address on an onboarded sending domain. Set `PUSH_WEBHOOK_URL` for an optional JSON push webhook (for example an ntfy topic).

`POST /run` with `Authorization: Bearer $CRON_SECRET` runs the scheduler manually. `GET /health` is unauthenticated.

## Environment

| Variable | Worker | Purpose |
| --- | --- | --- |
| `WEB_ORIGIN` | API | Comma-separated allowed site origins for CORS |
| `EMERGENCY_BASE_URL` | API | Site URL used to build private page links |
| `WEB_BASE_URL` | cron | Site URL used in emails and push payloads |
| `EMAIL_FROM` / `EMAIL_REPLY_TO` | cron | Sender and reply-to addresses |
| `RESEND_API_KEY` | cron secret | Resend API key |
| `PUSH_WEBHOOK_URL` | cron | Optional push gateway |
| `CRON_SECRET` | cron secret | Bearer secret for `POST /run` |
| `VITE_API_URL` | web build | Full API base URL used by the browser |
| `VITE_SITE_URL` | web build | Canonical site URL for metadata |
| `VITE_WORKER_URL` | web build | Worker URL used by the support page health check |

## Tests

```bash
npm test                 # web (Vitest), worker (Vitest), Go unit tests
npm run build:web        # type-check and production build
npm --workspace @travel-safe/api run typecheck   # Go → wasm build
```

Go packages that import `syscall/js` (the HTTP layer and D1 store) are exercised through the deployed smoke tests; the pure packages (validation, media classification, IDs, timestamps, model) have unit coverage.

## Safety and privacy

- Location history is retained for 7 days and then deleted.
- API keys are hashed; emergency links are random 256-bit capability tokens.
- SOS media lives in a private R2 bucket and is streamed only after a token check.
- Revoking a contact or rotating the owner link takes effect immediately, including media URLs.
- The emergency page is `noindex, nofollow` and does not list contacts or account contact details.

Read [the privacy policy](apps/web/src/pages/Privacy.tsx) and [terms](apps/web/src/pages/Terms.tsx), or the live pages at `/privacy` and `/terms`.

If someone is in immediate danger, call local emergency services.

## License

MIT — see [LICENSE.md](LICENSE.md).
