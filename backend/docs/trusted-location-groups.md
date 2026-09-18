# Trusted Contacts and Location-Sharing Groups

This is a hackathon/demo-only polling flow. It deliberately avoids permanent identity, invitations, websockets, background tracking, roles, and durable location history.

## Privacy boundary

Creating a group returns a six-character `group_code` for human sharing and a separate high-entropy `group_key`.

The short code alone is **not enough** to read or write locations. Every join, location update, and group-location read requires the `X-Group-Key` header. Wrong keys return the same `404 Location group not found` response as unknown groups to reduce casual group-code enumeration.

The key is still only a demo bearer secret. It is not equivalent to real user authentication and must not be presented as production-grade access control.

## Storage and freshness

- Latest positions are stored in process memory only.
- Restarting the backend clears all groups and locations.
- No historical route or location log is retained.
- Server timestamps are authoritative for freshness.
- Locations are marked stale after 120 seconds.
- The frontend should poll no faster than the returned 15-second interval.
- Location sharing should only publish while the user has explicitly enabled it.

## Frontend sequence

1. Create a group or receive a trusted person's code + group key.
2. Join with a temporary client ID and display name.
3. While sharing is enabled, publish the latest coordinate.
4. Poll `/locations` and render only the returned latest member positions.
5. Visually distinguish stale positions using the `stale` field.

This feature must be replaced by authenticated, durable authorization before production use.
