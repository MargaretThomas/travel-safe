# Frontend ↔ Backend Integration Matrix

This document is the implementation map for the current hackathon codebase.
It records what the Expo app needs from FastAPI and prevents duplicate or
incompatible contracts.

| Feature | Frontend surface | Backend contract | Status / owner |
|---|---|---|---|
| Safety heatmap | `frontend/src/components/safety-map.tsx`, `frontend/src/hooks/use-safety-heatmap.ts` | `GET /api/v1/heatmap` | Backend complete; latest `SafetyMap` still renders mock circles and needs frontend reconnection |
| Area safety detail | future map detail/card | `GET /api/v1/areas/{area_code}/safety`, `GET /api/v1/stats` | #11 / Lathithaa — staged PR #19 |
| Safety-map source provenance | future info/about panel | `GET /api/v1/sources`, `GET /api/v1/dataset/status` | #11 / Lathithaa — staged PR #19 |
| Halo discovery | issue #6 screen, future map markers | `GET /api/v1/halo`, `GET /api/v1/halo/{id}` | Backend complete; #6 frontend screen remains owner work |
| Halo submission | issue #6 screen | `POST /api/v1/halo` + `X-Client-ID` | Backend complete; frontend form not connected |
| Halo rating/like | Halo card/detail | `PUT /api/v1/halo/{id}/rating` + `X-Client-ID` | Backend complete |
| Halo rating enablement | Halo submitter/settings | `PUT /api/v1/halo/{id}/rating-settings` + `X-Client-ID` | Backend complete |
| Emergency picker numbers | emergency-picker UI if retained | `GET /api/v1/emergency-numbers` | Backend complete; current SOS screen uses local SMS flow and does not require this endpoint |
| Emergency service map locations | issue #5/map | `GET /api/v1/emergency-services` | #9 / Zoe — synchronized on PR #35; backend + tests ready |
| Trusted contacts/location groups | optional live-sharing UI | create/join/publish/poll location-group endpoints + `X-Group-Key` | Backend complete demo API; current trusted contacts remain local SQLite by design |
| Global in-app alerts | issue #3 | `GET /api/v1/notifications` | #10 / Zoe — not yet merged |
| Unified internal search | issue #12 map search | `GET /api/v1/search?q=...` | Backend complete; searches Halo + station/municipality/district data |
| External place/address search | issue #12/map provider | geocoder directly | Frontend/provider-owned; no backend proxy planned |
| Lower-risk route scoring | route alternatives on map | `POST /api/v1/routes/analyse` | Backend complete; requires real candidate polylines from frontend directions provider |
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
5. Review/merge Zoe's synchronized emergency-service-location fixture from PR #35.

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
