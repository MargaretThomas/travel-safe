# Backend Architecture

Travel Safe uses a Python 3.12 FastAPI backend as the single public API for the
Expo application.

## API contract

| Endpoint | Method | Access | Response |
|---|---|---|---|
| `/health` | GET | Public | Health status |
| `/api/v1/sources` | GET | Public | Safety-source governance |
| `/api/v1/dataset/status` | GET | Public | Active national safety-data mode and coverage |
| `/api/v1/stats` | GET | Public | Police-station annual crime statistics |
| `/api/v1/heatmap` | GET | Public | National station-level safety anchors |
| `/api/v1/map/search` | GET | Public | Police-station safety search |
| `/api/v1/search` | GET | Public | Unified Halo + internal safety search |
| `/api/v1/areas/{area_code}/safety` | GET | Public | Safety + danger signal |
| `/api/v1/trips` | POST | Public | Route geometry plus validated safety heatmap for the trip corridor |
| `/api/v1/routes/analyse` | POST | Public | Comparative lower-risk analysis for supplied real route alternatives |
| `/api/v1/emergency-numbers` | GET | Public | Verified emergency picker numbers |
| `/api/v1/location-groups` | POST | Public create | Demo group code + secret key |
| `/api/v1/location-groups/{group_code}/join` | POST | `X-Group-Key` | Join temporary member |
| `/api/v1/location-groups/{group_code}/members/{client_id}/location` | PUT | `X-Group-Key` | Publish latest member location |
| `/api/v1/location-groups/{group_code}/locations` | GET | `X-Group-Key` | Poll latest member locations |
| `/api/v1/halo` | GET | Public | Halo list + community visitability aggregates |
| `/api/v1/halo` | POST | `X-Client-ID` | Create community Halo |
| `/api/v1/halo/{halo_id}` | GET | Public | Halo detail + aggregates |
| `/api/v1/halo/{halo_id}/rating` | PUT | `X-Client-ID` | Idempotent rating/like/visit signal |
| `/api/v1/halo/{halo_id}/rating-settings` | PUT | Submitter `X-Client-ID` | Demo rating enable/disable |

## Access model

The hackathon backend intentionally separates three access modes:

1. **Public reads** for safety data, Halo discovery, emergency data and route context.
2. **Temporary client identity** via `X-Client-ID` for Halo community writes.
3. **Secret-scoped group access** via `X-Group-Key` for trusted-location groups.

Neither temporary header is production authentication. Durable identity and
authorization remain post-hackathon work.

## National safety data

The backend prefers a fully validated DataFirst/SAPS v1.4 CSV. If one is not
configured, it uses the checked-in validated 2025/2026 derived snapshot.

Validated v1.4 signature:

- 24,206 total station-year records;
- 1,174 station rows in 2025/2026;
- 1,128 mappable stations in the demo snapshot;
- model `danger-v1.1`.

Risk bands:

- Green: danger < 45;
- Orange: 45 <= danger < 75;
- Red: danger >= 75.

The source contains police-station aggregate counts. Station coordinates are
map/context anchors and are not crime-event locations.

## Trip planning

`POST /api/v1/trips` accepts an origin, destination and optional
`walking`/`driving` profile.

Route geometry behavior:

1. When `MAPBOX_ACCESS_TOKEN` is configured and Mapbox succeeds, the pathway
   uses Mapbox Directions.
2. Otherwise a deterministic mock pathway is returned so the app can still
   demonstrate the flow offline.

**Only route geometry may be mocked. Safety context is not mocked.**

The trip corridor heatmap is obtained from the existing `SafetyService`, so
it uses the validated DataFirst/SAPS national data (or the documented
reference fallback when national data is unavailable).

The pathway coordinate format remains `[longitude, latitude]`.

## Comparative route analysis

`POST /api/v1/routes/analyse` accepts one to three real candidate route
polylines supplied by a directions provider and compares their exposure to the
national safety layer.

It can return:

- comparative exposure score;
- green/orange/red exposure ratios;
- maximum contextual danger score;
- confidence;
- nearby Halo context;
- `lower_risk_route_id`.

This is **lower-risk route context**, not a safety guarantee.

## Halo and safety remain separate

Halo is a community visitability layer. Halo ratings, likes and visit evidence
never modify `danger_score`, `safety_score`, route exposure or risk bands.

A highly rated Halo may still sit inside a red/high-danger area.

## Trusted-location groups

Trusted-location groups are demo-only:

- the short group code is human-facing;
- `X-Group-Key` is required for join/read/write;
- only latest locations are retained in process memory;
- backend restart clears temporary group/location state;
- stale positions are timestamp-driven.

## Supporting contracts

See:

- [api-auth.md](api-auth.md)
- [danger-scoring.md](danger-scoring.md)
- [safety-data-sources.md](safety-data-sources.md)
- [emergency-numbers.md](emergency-numbers.md)
- [trusted-location-groups.md](trusted-location-groups.md)
- [halo.md](halo.md)
- [frontend-backend-integration.md](frontend-backend-integration.md)
- [search-routing.md](search-routing.md)
