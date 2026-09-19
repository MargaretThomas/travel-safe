# Halo

**Halo** is the canonical product name for the community place layer. Do not
use the retired "Golden Spots" name in new code, API contracts, UI copy, or
documentation.

## Purpose

Halo helps users discover places that people consider worth visiting even when
the surrounding area has elevated crime risk.

Halo does **not** change the safety-data engine.

A highly rated Halo can exist inside a red/high-danger area. The frontend must
show these as separate signals:

- area danger/safety from SAPS/DataFirst;
- Halo visitability from community feedback.

## Community signal

Each Halo exposes:

- `rating_enabled`;
- average 1–5 rating;
- rating count;
- like count;
- self-reported visit count;
- proximity-verified visit count;
- 0–100 visitability score derived from the average rating;
- visitability confidence based on evidence volume.

The visitability score is a community preference signal, **not a safety
score**.

## Temporary identity

Halo writes require `X-Client-ID`.

One client has one current rating per Halo, so updating a rating replaces the
client's previous vote rather than inflating the total.

The temporary client that submits a Halo may enable or disable rating for that
Halo during the demo. This is not secure production ownership and must migrate
to authenticated users after the hackathon.

## Visit evidence

A user may mark a rating as visited. If current coordinates are supplied and
are within 500 metres of the Halo, the server marks that visit as
`proximity_verified=true`.

This is lightweight demo evidence only. Device coordinates can be spoofed and
must not be described as identity-grade or fraud-proof verification.

## Routes

- `GET /api/v1/halo`
- `POST /api/v1/halo`
- `GET /api/v1/halo/{halo_id}`
- `PUT /api/v1/halo/{halo_id}/rating`
- `PUT /api/v1/halo/{halo_id}/rating-settings`
