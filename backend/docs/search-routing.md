# Search and Lower-Risk Route Context

This contract is backend support for the map/search frontend. It does not
replace the frontend map provider.

## Unified Travel Safe search

`GET /api/v1/search?q=<query>&year=2025/2026&limit=20`

Searches Travel Safe-owned data:

- Halo name, description and location label;
- police-station name;
- local municipality;
- district municipality.

Results use one shape with `result_type` equal to `halo` or
`police_station`.

Exact name matches rank before prefix/name matches, which rank before broader
municipality/district matches.

External street addresses, POIs and general geocoding remain the frontend
map/directions provider's responsibility.

## Route analysis

`POST /api/v1/routes/analyse`

The request contains one to three **real route polylines** returned by a
directions provider. The backend does not invent road geometry from crime
station centroids.

Example request:

```json
{
  "year": "2025/2026",
  "candidates": [
    {
      "id": "route-a",
      "profile": "walking",
      "distance_meters": 8400,
      "duration_seconds": 960,
      "coordinates": [
        {"latitude": -33.92, "longitude": 18.42},
        {"latitude": -33.93, "longitude": 18.44}
      ]
    }
  ]
}
```

The analyser samples each supplied route, finds nearby national safety
anchors, and returns comparative exposure:

- `exposure_score` from 0-100;
- inverse `safety_context_score`;
- green/orange/red exposure ratios;
- maximum observed danger score;
- confidence;
- nearby Halo context.

If multiple candidates have usable safety context,
`lower_risk_route_id` identifies the one with the lowest comparative
exposure, with red/orange exposure and distance as tie-breakers.

## Important interpretation

This endpoint provides **lower-risk route context**, not a safety guarantee.

The source data is annual SAPS/DataFirst police-station aggregate data.
Station coordinates are context anchors, not incident locations, and they do
not establish street-level risk.

Halo remains independent:

- Halo can identify a worthwhile place near a route;
- Halo ratings/likes/visits never reduce route exposure;
- a highly rated Halo can exist in a red/high-danger area.

## Frontend/provider dependency

Before route analysis can be used end-to-end, the frontend needs a directions
provider that returns road-route geometry and alternative routes.

The repository currently includes map SDK dependencies but no committed
directions/geocoding adapter or configured provider token. Until that provider
is selected/configured, the backend route analyser can be tested with supplied
candidate polylines but cannot create road routes by itself.
