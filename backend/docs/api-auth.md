# API Access and Temporary Identity Contract

Travel Safe does **not** have production user authentication in the hackathon
MVP. Firebase/token authentication remains deferred.

The API therefore uses three deliberately different access modes.

## 1. Public read endpoints

No identity header is required for public safety and discovery information:

- `GET /health`
- `GET /api/v1/sources`
- `GET /api/v1/dataset/status` when the national-data branch is merged
- `GET /api/v1/heatmap`
- `GET /api/v1/stats`
- `GET /api/v1/areas/{area_code}/safety`
- `GET /api/v1/halo`
- `GET /api/v1/halo/{halo_id}`
- `GET /api/v1/emergency-numbers`
- `GET /api/v1/emergency-services` when issue #9 is delivered
- `GET /api/v1/notifications` when issue #10 is delivered

Public reads must not expose local filesystem paths, API secrets, temporary
client identifiers, group keys, or internal ownership fields.

## 2. Temporary client identity: X-Client-ID

Community writes use:

`X-Client-ID: <temporary-device-or-session-id>`

Current uses:

- create a Halo;
- rate/like a Halo;
- control rating enablement for a Halo submitted by the same temporary client.

The header is validated for a small safe character set and length. It enables
idempotence and demo ownership semantics only.

**X-Client-ID is not authentication.** It can be spoofed and must not be used
for production authorization, identity, payments, or sensitive personal data.

## 3. Secret-scoped temporary groups: X-Group-Key

Trusted-location groups use a separate high-entropy group secret:

`X-Group-Key: <group-secret>`

The short human group code is not sufficient to read or write locations.
Unknown and unauthorized groups return the same 404 response to reduce casual
enumeration.

This is still demo-only bearer-secret access. Real location sharing requires
authenticated accounts, explicit consent, revocation, durable authorization,
and audited retention controls before production.

## Error semantics

- Missing/invalid required `X-Client-ID`: 401.
- Missing resource: 404.
- Demo ownership mismatch: return 404 when revealing ownership would expose
  resource metadata.
- Invalid request shape/range: FastAPI/Pydantic 422.
- Unsupported safety-data year: 404; never silently substitute another year.

## Future production auth

Post-hackathon authentication work should add:

1. Firebase or equivalent token verification middleware;
2. stable user profiles;
3. explicit endpoint authorization policies;
4. Halo ownership migration from temporary client IDs;
5. trusted-group membership and revocation;
6. abuse/rate limiting for ratings and submissions;
7. audit/event retention rules.
