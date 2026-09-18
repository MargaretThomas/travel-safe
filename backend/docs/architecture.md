# Backend Architecture

The backend runs on Python 3.12 with FastAPI and Uvicorn. It is the single
public API consumed by the Travel Safe Expo client.

## API contract

| Endpoint | Method | Access | Response |
|---|---|---|---|
| `/health` | GET | Public | `{"status":"ok"}` |
| `/api/v1/sources` | GET | Public | Safety-source governance |
| `/api/v1/dataset/status` | GET | Public | Active national safety-data mode |
| `/api/v1/stats` | GET | Public | Station annual statistics |
| `/api/v1/heatmap` | GET | Public | National station safety anchors |
| `/api/v1/map/search` | GET | Public | Police-station search |
| `/api/v1/areas/{area_code}/safety` | GET | Public | Safety + danger signal |
| `/api/v1/emergency-numbers` | GET | Public | Verified emergency picker numbers |
| `/api/v1/location-groups` | POST | Public create | Demo group code + secret key |
| `/api/v1/location-groups/{group_code}/join` | POST | `X-Group-Key` | Join temporary member |
| `/api/v1/location-groups/{group_code}/members/{client_id}/location` | PUT | `X-Group-Key` | Publish latest location |
| `/api/v1/location-groups/{group_code}/locations` | GET | `X-Group-Key` | Poll latest member locations |

## National safety data

The backend prefers a fully validated DataFirst/SAPS v1.4 CSV. If one is not
configured, it uses the checked-in validated 2025/2026 derived snapshot.

Validated v1.4 signature:

- 24,206 total station-year records;
- 1,174 stations in 2025/2026;
- 1,128 mappable station rows in the demo snapshot;
- model `danger-v1.1`.

Risk bands:

- Green: danger < 45;
- Orange: 45 <= danger < 75;
- Red: danger >= 75.

Halo is a separate visitability/community signal and never modifies these
safety scores.

## Temporary location-sharing access

Trusted-location groups are hackathon/demo only.

- Short group code is human-facing.
- `X-Group-Key` is required for join/read/write.
- Only latest locations are retained in process memory.
- Server timestamps control stale-state handling.
- Restarting the API clears group/location data.

See:
- [danger-scoring.md](danger-scoring.md)
- [safety-data-sources.md](safety-data-sources.md)
- [emergency-numbers.md](emergency-numbers.md)
- [trusted-location-groups.md](trusted-location-groups.md)
