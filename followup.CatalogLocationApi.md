# Follow-up: Catalog Location API — Frontend / OpenAPI Handoff

This document hands the **Catalog Location** endpoints to the web client team. It mirrors the
OpenAPI definitions now live in Swagger (`/api-docs`, non-prod only) so the UI can be built
against a stable contract.

## Summary

A catalog's location is now a **separate resource** (`Location`) linked to a catalog by
`catalogId`, instead of the old free-text `catalog.location` / `catalog.locationZip` strings.
This unlocks structured address data and coordinate-based search.

- **One location per catalog.** Creating a second location for the same catalog returns `500`
  (`"Catalog already has a location"`).
- **Catalogs without a location keep working.** Reads return `{ "location": null }` — the UI must
  handle the null case (show an "add location" affordance).
- The legacy `catalog.location` / `catalog.locationZip` fields still exist on the catalog and are
  untouched by this feature; migrate the UI to the new endpoints when ready.

## Base path

`/location` (mounted in `app.js`).

Auth: `Authorization: Bearer <jwt>` on the mutating endpoints. Reads are public.

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/location/catalog/{catalogId}` | Bearer + catalog owner | Create the catalog's location |
| `GET` | `/location/catalog/{catalogId}` | public | Read a catalog's location (or `null`) |
| `GET` | `/location/{locationId}` | public | Read a location by id |
| `POST` | `/location/{locationId}/update` | Bearer + catalog owner | Update a location |
| `POST` | `/location/{locationId}/delete` | Bearer + catalog owner | Delete a location |

Status codes: `401` (not authenticated), `403` (authenticated but not the catalog owner),
`404` (`GET /location/{locationId}` when missing), `400`-ish/`500` on validation failures.

## Schemas

### Location (response)
```json
{
  "_id": "64a1b2c3d4e5f6a7b8c9d0f2",
  "lat": 19.432608,
  "lng": -99.133209,
  "street_name": "Av. Insurgentes Sur",
  "city": "Ciudad de México",
  "state": "CDMX",
  "number": "300",
  "additional_number": "4B",
  "neighborhood": "Roma Norte",
  "catalogId": "64a1b2c3d4e5f6a7b8c9d0e2",
  "zoneId": null
}
```

- `lat` / `lng` — **decimal degrees** (`number`, not integer). These are *not* monetary values, so
  the cents rule does not apply.
- `neighborhood` — the Mexican *colonia*.
- `additional_number` — interior / apartment number.
- `zoneId` — **placeholder, always `null` for now** (see "Zones" below). Do not rely on it yet.

### CreateLocationRequest / UpdateLocationRequest (body)
All fields optional; both share the same shape. `catalogId` and `zoneId` are **never** accepted
from the client — `catalogId` comes from the URL, `zoneId` is server-managed.
```json
{
  "lat": 19.432608,
  "lng": -99.133209,
  "street_name": "Av. Insurgentes Sur",
  "city": "Ciudad de México",
  "state": "CDMX",
  "number": "300",
  "additional_number": "4B",
  "neighborhood": "Roma Norte"
}
```

## Example flows

**Create**
```
POST /location/catalog/64a1b2c3d4e5f6a7b8c9d0e2
Authorization: Bearer <jwt>
Content-Type: application/json

{ "lat": 19.4326, "lng": -99.1332, "city": "Ciudad de México", "neighborhood": "Roma Norte" }
→ 201 { "message": "Location created", "location": { ... } }
```

**Read (may be null)**
```
GET /location/catalog/64a1b2c3d4e5f6a7b8c9d0e2
→ 200 { "location": null }   // catalog has no location yet
```

**Update**
```
POST /location/64a1b2c3d4e5f6a7b8c9d0f2/update
Authorization: Bearer <jwt>
{ "city": "Guadalajara" }
→ 200 { "message": "Location updated", "location": { ... } }
```

## Zones (`zoneId`) — deferred design proposal

The acceptance criteria left `zoneId` as an intentional placeholder. Proposed direction for the
architects (not yet built — `zoneId` is stored as `null`):

- A **Zone** is server-derived indexing metadata, resolved from `lat`/`lng` at write time, so
  searches can pre-filter by a coarse bucket before doing a fine coordinate comparison.
- Cheapest first step (fits the "cheap VPS" constraint): derive a **geohash prefix** (e.g. 5–6
  chars) from the coordinates and store it as the zone key — no extra collection, no geo engine.
- If richer zones are needed later (admin-drawn delivery areas), promote `zoneId` to a real
  `Zone` collection reference and backfill via a migration.
- Until then the `{ lat, lng }` compound index on `locationSchema` already supports bounding-box
  queries, which is enough for the first search iteration.

## Notes for the frontend

- Always handle `location === null` on the read endpoints.
- Do not send `catalogId` or `zoneId` in request bodies — they are ignored / server-managed.
- Coordinates are plain decimals; validate ranges client-side (`lat` ∈ [-90, 90],
  `lng` ∈ [-180, 180]) before submitting.
