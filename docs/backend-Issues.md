# Travel Safe — Backend Issues

A working list of backend build tasks for the hackathon, prioritised from 14:00 on Friday. Each item below should become its own GitHub issue in `travel-safe`, with its endpoint added to the API contract table in `backend/docs/architecture.md` before the frontend depends on it. Prefer small, deterministic demo datasets and tested response shapes over new infrastructure that cannot be verified before submission.

---

### 1. Heatmap & Safety Data Endpoint (Day 1 MVP)

**Assigned to:** Lathithaa (backend lead)

Build `GET /api/v1/heatmap` to return a small Cape Town demo dataset that the frontend can render as coloured circles or polygons. Each item needs an identifier, label, coordinates or simple boundary, normalized safety score, risk category, and source attribution. Use a checked-in fixture derived from a clearly named SAPS release rather than attempting live ingestion or neighbourhood-level calculations today. Add response-model and endpoint tests, document the exact shape, and treat broader coverage and automated data updates as follow-up work.

### 2. Emergency Service Locations Endpoint (Day 1 MVP)

**Assigned to:** Zoe (backend developer)

Build `GET /api/v1/emergency-services` to return a checked-in set of demo-area hospitals, police stations, fire stations, and mountain-rescue contacts. Each record needs a stable identifier, name, service type, latitude, longitude, and phone number when verified; omit a reliability or safety rating unless the team has a defensible source. Keep service-type values aligned with the frontend picker, support an optional type filter only if quick to add, and cover the response with a focused endpoint test.

### 3. Emergency Contact Numbers Endpoint (Day 1 MVP)

**Assigned to:** Lathithaa (backend lead)

Build `GET /api/v1/emergency-numbers` to return the verified numbers used by the Day 1 emergency picker for the demo region. Keep the contract small: service type, display name, phone number, coverage label, and source attribution. Do not attempt GPS-to-jurisdiction matching before the checkpoint; the frontend can show the coverage label and let the user choose. Reuse location records where sensible, avoid ambiguous numbers, document the fixture source, and test that every supported service category has a usable response.

### 4. Golden Local Spots API (Day 1 MVP)

**Assigned to:** Zoe (backend developer)

Build only `GET /api/v1/golden-spots` and `POST /api/v1/golden-spots` for the MVP. A spot needs an ID, name, short description, location label, coordinates, and creation time; `submitted_by` may be an optional display name while authentication is deferred. Seed a few demo spots and use the simplest storage already available, documenting if writes are in memory and reset on restart. Validate required fields and add tests, but defer update, delete, ratings, upvotes, photos, moderation, sorting, and popularity logic.

### 5. Trusted Contacts & Location-Sharing Groups (Day 2 stretch)

**Assigned to:** Lathithaa (backend lead)

Only start this after every Day 1 endpoint supports the demo. Implement one minimal polling flow: create or join a group using a short code, `PUT` a member's latest coordinates under a temporary client ID, and `GET` the group's latest member locations. Store a server timestamp so the UI can identify stale positions. Do not build invitations, websockets, background tracking, access-control roles, or permanent identity. If safe group separation cannot be demonstrated without authentication, defer the feature rather than exposing arbitrary location data.

### 6. Global Notifications System (Day 2 stretch)

**Assigned to:** Zoe (backend developer)

Implement a polled in-app alert feed, not mobile push. Add `GET /api/v1/notifications` for active alerts and, only if needed for the demo, a protected-by-demo-secret or locally invoked way to create an alert. Each item needs an ID, title, short message, category, severity, creation time, and optional expiry time. Seed one realistic alert and test expiry filtering. Do not add device tokens, Firebase Cloud Messaging, background delivery, queues, or delivery guarantees during the hackathon.

### 7. Map Search Support (Day 2, probably no backend work)

**Assigned to:** Zoe (backend developer)

Confirm that the frontend can use the map provider's geocoding API directly, then close this issue with that decision recorded. Build `GET /api/v1/search` only if the core demo is complete and users must search the app's own Golden Local Spots or emergency-service fixtures. If built, accept a short text query and return a capped, consistently shaped combined result set using simple case-insensitive matching. Do not proxy external geocoding, add full-text infrastructure, or build ranking logic for the MVP.

### 8. User Authentication (Firebase) — deferred to v2

**Assigned to:** Unassigned until after the hackathon

Do not add Firebase authentication or token-verification middleware for the hackathon submission. Keep the public v1 endpoints free of user-account assumptions, and use temporary client IDs only in the optional trusted-contacts demo with its limitations documented. Avoid designing ownership or authorization behavior that looks production-ready without real identity enforcement. After the event, split this into token verification, authenticated user profiles, endpoint authorization, and data-migration issues so the security-sensitive work can be implemented and reviewed separately.
