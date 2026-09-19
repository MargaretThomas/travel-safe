# Backend Project Backlog

## Lathithaa deliverables

| Task | Status | Contract / PR |
|---|---|---|
| Backend scaffold + health | Done | `GET /health` |
| National safety dataset validation | Done | DataFirst/SAPS v1.4 + validated 2025/2026 snapshot |
| Heatmap + safety API (#11) | Done / review | PR #19 |
| Emergency contact numbers (#14) | Done / review | PR #22 |
| Trusted location-group API (#8) | Done / review | PR #23 |
| Halo visitability/rating API (#24) | Done / review | PR #25 |
| Unified internal map search support | Done locally on integration branch | `GET /api/v1/search` |
| Lower-risk route-context analyser | Done locally on integration branch | `POST /api/v1/routes/analyse` |
| Combined backend compatibility | Done | Integration PR #28 |

## Backend work owned elsewhere

| Task | Owner | Status |
|---|---|---|
| Emergency service map locations (#9) | Zoe | Open |
| Global notifications endpoint (#10) | Zoe | Open |
| Original Golden Local Spots API issue (#13) | Zoe | Open; coordinate with canonical Halo API before duplicate implementation |

## Known backend limitations for submission

### Persistence

Halo submissions/ratings and trusted location groups are currently in process
memory. Restarting the backend resets community writes and location groups.

The repository contains a `DATABASE_URL` placeholder, but backend requirements
currently contain no Postgres/Supabase database driver or ORM. Persistence must
therefore be treated as **not implemented**.

For the hackathon demo this is acceptable only if the team is comfortable
using seeded Halo data and recreating temporary sharing groups after a restart.

### Directions/geocoding provider

The backend route analyser does not create road routes. It requires one to
three real candidate polylines from a frontend directions provider.

External address/place geocoding and directions remain frontend/provider work.

### Deployment

The root README states that backend deploys automatically through Render after
merge. Before submission the team must confirm:

1. the reviewed backend changes are merged to the branch Render deploys;
2. the deployed health endpoint returns 200;
3. the frontend receives the deployed API base URL;
4. CORS includes the relevant Expo/web origin when applicable.

## Recommended next order

1. Get reviews/merge decisions on #19, #22, #23 and #25.
2. Review and merge the additive search/route backend changes from integration.
3. Confirm Render deployment and exercise the live API.
4. Frontend owners reconnect the current map to the already-present safety
   client/hook and connect #6/#12 to the documented backend contracts.
5. Decide whether persistence is necessary for the judged demo. Do not add a
   new database layer unless the demo genuinely requires writes to survive
   backend restarts.
