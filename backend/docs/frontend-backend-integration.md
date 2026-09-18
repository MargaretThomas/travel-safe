# Frontend ↔ Backend Integration Matrix

This document is the implementation map for the current hackathon codebase.
It records what the Expo app needs from FastAPI and prevents duplicate or
incompatible contracts.

| Feature | Frontend surface | Backend contract | Status / owner |
|---|---|---|---|
| Safety heatmap | `frontend/src/components/safety-map.tsx`, `frontend/src/lib/safety-map.ts` | `GET /api/v1/heatmap` | #11 / Lathithaa — backend staged in PR #19; frontend still uses mock zones |
| Area safety detail | future map detail/card | `GET /api/v1/areas/{area_code}/safety`, `GET /api/v1/stats` | #11 / Lathithaa — staged PR #19 |
| Safety-map source provenance | future info/about panel | `GET /api/v1/sources`, `GET /api/v1/dataset/status` | #11 / Lathithaa — staged PR #19 |
| Halo discovery | issue #6 screen, future map markers | `GET /api/v1/halo`, `GET /api/v1/halo/{id}` | #13/#24 — Halo contract branch; coordinate with Zoe/Margaret |
| Halo submission | issue #6 screen | `POST /api/v1/halo` + `X-Client-ID` | #13/#24 — Halo contract branch |
| Halo rating/like | Halo card/detail | `PUT /api/v1/halo/{id}/rating` + `X-Client-ID` | #24 / Lathithaa — implementing |
| Halo rating enablement | Halo submitter/settings | `PUT /api/v1/halo/{id}/rating-settings` + `X-Client-ID` | #24 / Lathithaa — implementing |
| Emergency picker numbers | issue #5 UI | `GET /api/v1/emergency-numbers` | #14 / Lathithaa — draft PR #22 |
| Emergency service map locations | issue #5/map | `GET /api/v1/emergency-services` | #9 / Zoe — not yet merged |
| Trusted contacts/location groups | issue #4 UI | create/join/publish/poll location-group endpoints + `X-Group-Key` | #8 / Lathithaa — draft PR #23 |
| Global in-app alerts | issue #3 | `GET /api/v1/notifications` | #10 / Zoe — not yet merged |
| External place/address search | issue #18 | map provider geocoder directly | frontend-owned / no backend proxy planned |
| Internal Halo search | Halo/map search | `GET /api/v1/halo?q=...` | Halo contract branch |
| Settings | issue #7 | local app state for MVP | no backend required unless account sync is added |
| Side navigation | issue #17 | navigation only | no backend required |

## Immediate integration order

### Day-1 / demo critical

1. Merge or approve #11 national safety contract.
2. Replace `MOCK_SAFETY_ZONES` with a typed fetch of `/api/v1/heatmap`,
   keeping mock data only as an explicit offline/demo fallback.
3. Connect issue #5 emergency picker to PR #22's typed adapter.
4. Agree the Halo rename with Zoe/Margaret and consume the canonical
   `/api/v1/halo` contract.
5. Merge Zoe's emergency-service-location fixture when ready.

### Day-2 / stretch

1. Connect trusted-location UI to PR #23.
2. Add Halo rating/like controls after the Halo list/submission screen works.
3. Connect in-app notification polling when issue #10 lands.
4. Keep external geocoding in the map provider rather than proxying it through
   FastAPI.

## Safety + Halo rule

Halo visitability and area danger are intentionally independent signals.

A Halo may have:

- high community visitability;
- many likes or proximity-verified visits;
- **and still sit inside a red/high-danger area**.

The frontend should display both signals rather than using Halo feedback to
modify, mask, or reduce the SAPS/DataFirst danger score.
