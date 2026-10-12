# Handover — Location Search API (`GET /location/lookup`)

**For the web client team.** This is the contract for the map's proximity search, the client-side
rules it depends on, and the four things that will bite if they are guessed at.

Verified end-to-end against a live server on 2026-10-10: real `$geoNear` over a real `geo_2dsphere`
index, four seeded sellers, every status below reproduced. The numbers in this document are copied
from those responses, not from the source.

| Companion document | What it is |
|---|---|
| `guide.LocationSearch.md` | the engineering state of the feature (read this if you are changing the API) |
| `blueprint.LocationBasedSearch.md` | the design and the reasoning |
| `/api-docs` → **Location** → `GET /location/lookup` | the live OpenAPI contract |

---

## 1. The request

```
GET /location/lookup?lat=19.432608&lng=-99.133209
```

**Public — no `Authorization` header.** A buyer browsing the map has not logged in, and the endpoint
does not care who is asking.

| Parameter | Required | Default | Max | Notes |
|---|---|---|---|---|
| `lat` | **yes** | — | — | decimal degrees. Missing/malformed/out-of-range → **400** |
| `lng` | **yes** | — | — | decimal degrees. Same |
| `radius` | no | `7000` | `50000` | **metres**. Clamped, never rejected |
| `limit` | no | `200` | `500` | Clamped. You should not need to send it |
| `skip` | no | `0` | — | Only needed if `truncated` is true |

Send `lat`/`lng` and nothing else. The defaults *are* the cold-call contract: 7 km, 200 results.
Hardcoding `?radius=7000` in the client is harmless but pointless — and it means a future change to
the radius needs a client release.

---

## 2. The response

```json
{
  "results": [
    {
      "catalogId": "6acad4545cccf5e0c30ae44c",
      "alias": "Pan de Ana",
      "image": "https://images.alkachof.mx/68a1f/catalogs/64a1_1757000000000.webp",
      "lat": 19.433,
      "lng": -99.133,
      "city": "Ciudad de México",
      "neighborhood": "Centro",
      "distanceMeters": 1100
    }
  ],
  "total": 2,
  "truncated": false,
  "limit": 200,
  "skip": 0,
  "radiusMeters": 7000
}
```

**`results` is sorted nearest-first.** Keep that order; it is the only ranking the API gives you and
re-sorting by anything else throws it away.

| Field | Read it as |
|---|---|
| `catalogId` | the only id you need. `/catalog/<catalogId>` is the shop page |
| `alias` | the shop name. **Can be `""`** — a seller who never named their catalog. Fall back to something, do not render an empty marker label |
| `image` | catalog image url, **may be absent** (seller never uploaded one). Render your placeholder |
| `lat` / `lng` | **approximate** — see §3. A marker position, never an address |
| `city` / `neighborhood` | free text, may be `""` |
| `distanceMeters` | metres from the point you asked about, rounded to 100. `0` means "under 50 m" |
| `truncated` | **the only honest "is there more"** — see §5 |
| `radiusMeters` | the radius that actually applied, after clamping. Measure your drag against this, not against your own copy of 7000 |
| `total` | **do not display this** — see §5 |

### 2.1 Statuses

| Status | Meaning | What the client does |
|---|---|---|
| **200** | the page, possibly empty | render. An empty `results` is a valid answer, not an error — show "no shops near here", never a failure state |
| **400** | `lat`/`lng` missing, malformed or out of range | a client bug. Body: `{ "message": "lat and lng must be a valid coordinate pair in decimal degrees" }` |
| **404** | proximity search is not enabled on that deployment | hide the map feature, do not retry. Body is a generic `{ "message": "Not found" }` |
| **429** | too many lookups from this address | §4 |

There is no 401 and no 403.

---

## 3. The coordinates are approximate, and that is deliberate

`lat`/`lng` on a result are **snapped to three decimal places** — a ~110 m grid. A marker lands
within about 75 m of the real shop.

```
stored   19.432608, -99.133209
returned 19.433,    -99.133
```

This is not a bug to work around and not something to compensate for client-side. These sellers are
nano-entrepreneurs whose catalog address is frequently their home, and one cold call returns every
located seller in a city district. Exact coordinates would turn "look up the address of a shop whose
id I hold" into "enumerate every seller's doorstep in Roma Norte". `distanceMeters` is rounded to
100 m for the same reason — an exact distance from three chosen origins reconstructs an exact point.

**Three consequences for the UI:**

1. **Never present these as a street address.** No "located at", no reverse geocoding into a
   displayed address, no "get directions" built from them. If a buyer needs a real address, that
   belongs after an order, through the seller.
2. **Do not zoom a marker to street level** as if it were precise. At neighbourhood zoom it is
   right; at doorstep zoom it is visibly off, and a user reading it as exact will go to the wrong
   door. A radius circle or a soft marker reads more honestly than a sharp pin.
3. **Two shops in the same block can collide on the same point.** The grid is ~110 m, so clustering
   or a small deterministic offset for overlapping markers is a client concern. Do not de-duplicate
   by coordinate — `catalogId` is the identity.

If product wants exact pins, that is a product decision and it has to be made deliberately: it is
**not reversible** once published, because what is served can be scraped and kept.

---

## 4. Rate limiting — the client keeps its own 10 s rule

The server allows **6 lookups per 60 seconds per client IP**. The client should still
self-throttle to **one call per 10 seconds**, which is the rule that actually governs normal use;
the server budget exists so that a bug or a scraper cannot bypass it.

The two are deliberately different shapes. A hard 10-second floor on the server would 429 people
doing nothing wrong: Mexican mobile carriers run CGNAT, so many real users share one address, and a
fast drag legitimately crosses two circles inside 10 s. Averaging the same budget over a minute
keeps the ceiling while letting a burst and a shared address through.

**Every response carries the budget**, so you never have to guess:

```
RateLimit-Policy: 6;w=60
RateLimit: limit=6, remaining=5, reset=60
```

On a 429:

```
HTTP/1.1 429 Too Many Requests
Retry-After: 60
{ "message": "Too many requests, please try again later",
  "availableAt": "2026-10-11T00:13:47.957Z" }
```

`availableAt` is an ISO timestamp — the same 429 shape the broadcast cooldown uses, so one handler
covers both.

**What the client should do:**

- Treat a 429 as *"keep showing what you have"*, never as an error state. The whole design is that
  you already hold a 7 km circle of results; a refused refresh means the map is slightly stale, not
  broken.
- Retry at `availableAt` / `Retry-After` at the earliest. Do not retry immediately, and do not retry
  on a timer tighter than the header says.
- A **400 counts against the budget too.** Six malformed calls lock the client out for a minute, so
  validate `lat`/`lng` before sending rather than letting the server do it.

Counters are in-memory and reset when the API process restarts; they do not span instances. Don't
build anything that depends on them persisting.

---

## 5. `total` vs `results.length` vs `truncated` — read this before writing the counter

These three disagree on purpose, and getting it wrong produces a wrong number on screen.

- **`results.length`** — what you can draw. **This is the number to display.**
- **`total`** — located rows inside the circle, counted **before** the active-seller filter. It
  includes shops that were dropped from `results` because their owner is banned, inactive or never
  verified a phone. **Never render it.** Reproduced live: a banned seller's row left `results` but
  stayed in `total`, giving `results: ['Centro'], total: 2`.
- **`truncated`** — `true` when the circle holds more than was returned. **This is the only
  completeness signal.**

You cannot derive `truncated` yourself. `results.length` is counted after the filter and `total`
before it, so comparing them reads every inactive seller in the radius as a missing page. In the
extreme, a full page of banned sellers returns `results: []` with more still behind it.

```js
// right
setShopCount(data.results.length);
if (data.truncated) fetchMore(data.skip + data.limit);

// wrong — counts shops the API deliberately withheld
setShopCount(data.total);
// wrong — "more" is not derivable from these two
if (data.results.length < data.total) fetchMore();
```

With today's collection `truncated` will be `false` on every real cold call: 200 results is far more
than a 7 km circle holds. Handle it anyway — it is the signal that will tell us when paging has to
become a real feature, and if the client ignores it we will find out from a user instead.

---

## 6. The cold-call pattern

```
                     ┌─ 7 km circle fetched at P ─┐
  open map  ──► call /lookup at P ──► hold results in memory
                                       │
  user pans ─────────────────────────► redraw from memory      (no request)
                                       │
  user pans past P ──────────────────► call /lookup at P'      (≥10 s since the last)
                                       └─ replace or merge, your choice
```

- **One call per circle, not per drag.** The invisible centre marker gives you `P`; hold the results
  and redraw locally while the user pans. That is what makes the navigation smooth, and it is why
  the page is sized to return a whole circle instead of being paged.
- **Call again when the user drags beyond `P`.** The exact trigger distance is yours to tune —
  anything up to `radiusMeters` works, and a fraction of it (say 60–70%) keeps a margin of loaded
  results around the viewport so the user never sees an empty edge. Measure against the
  `radiusMeters` the server echoed.
- **Merging is a client decision.** Replacing the set is simpler and always correct. Merging by
  `catalogId` keeps markers stable across calls but means a shop that has since been removed or
  banned stays on the map until a reload — if you merge, expire old entries.
- **Zooming out is not a bigger radius.** `radius` up to 50 km is accepted, but a wider circle is a
  bigger, slower response, and `distanceMeters` stays rounded to 100 m either way. Prefer the 7 km
  default and let the user pan.

### What is *not* on the map

A catalog is absent from `results` whenever any of these is true, and none of them is an error:

- it has **no coordinates on file** — by far the most common case today. There is no map picker in
  the client yet, so most sellers have never placed themselves. **This is the real constraint on the
  feature, not the API**: until a picker ships, the map is mostly empty.
- its **owner is not `active`** (banned, inactive, or signed up and never verified a phone)
- its **location row was deleted**, or the seller **removed their pin** (see §7)
- it is **outside the radius**

---

## 7. The seller side — how a shop gets on the map, and off it

The client half of this is the map picker, which does not exist yet. The API is ready for it.

```
POST /location/catalog/{catalogId}      auth + catalog owner    create
POST /location/{locationId}/update      auth + location owner   move, or remove the pin
POST /location/{locationId}/delete      auth + location owner   delete the whole location
GET  /location/catalog/{catalogId}      public                  read (or null)
```

`lat`/`lng` on **update** are three-state, and the client has to be deliberate about which it sends:

| Body | Effect |
|---|---|
| `{ "city": "Guadalajara" }` — keys absent | address changes, **pin untouched** |
| `{ "lat": 19.43, "lng": -99.13 }` | pin moves, on the map within the same request |
| `{ "lat": null, "lng": null }` | **pin removed** — the shop leaves the map immediately, address kept |
| `{ "lat": null }` — one side only | **400.** A pin is removed as a pair |

An omitted key means "leave it alone", so a form that always posts every field will overwrite the
pin with whatever its inputs hold — including a blank one. **Send the pin only when the user touched
the map**, and send both nulls when they explicitly clear it.

A bad coordinate on create or update is a **400** with the same message `/lookup` gives, not a 500.
Reproduced live: `{"lat":999,"lng":-99.13}` → 400.

Deleting the location removes the pin too, but it also discards the address. "Take me off the map"
should be the two-null update, not a delete.

---

## 8. Deployment — the one thing that is not code

`LOCATION_SEARCH_ENABLED=true` must be set on every environment where the map is used. **Unset means
the endpoint answers 404**, which is the safe default for a box nobody configured, not a sign that
anything is broken.

So: if the map works locally and 404s on staging, that variable is the first thing to check, not the
client.

For whoever enables it on a new environment, in this order:

1. `db.locations.getIndexes()` must show **`geo_2dsphere`**. A 2dsphere build that fails does *not*
   stop the process, so a missing index and a healthy API look identical from outside — the symptom
   is an endpoint that returns an empty list forever, for every query, which is indistinguishable
   from "no shops near you".
2. `node scripts/backfillLocationGeo.js` (dry run first, then `--commit`) for rows written before
   `location.geo` existed. Read the skip report: "no coordinates on file" will be most of the
   collection and is expected; anything flagged **transposed** or **outside Mexico** needs a human.
3. Set `LOCATION_SEARCH_ENABLED=true`.
4. **Spot-check two shops you actually know** — a real distance in metres that matches a real map.
   This is the step that catches a latitude/longitude transposition, and a unit test with a made-up
   fixture can agree with itself while being wrong. A transposed pair puts every shop in Mexico City
   off the coast of Somalia and the only symptom is an empty list.

Also worth dropping by hand once the feature has been live for a release:
`db.locations.dropIndex('lat_1_lng_1')` — superseded by the 2dsphere index, read by nothing, and
mongoose only ever *creates* indexes.

---

## 9. Known limits, so you do not design around them

- **No map picker, so the map is nearly empty.** The blocker is frontend work, not this API. A
  prompt on the seller's dashboard for a catalog with no location is the obvious companion and does
  not exist either.
- **`skip` paging shifts** if rows change between calls. Fine for a discovery feed; irrelevant while
  `truncated` is always false.
- **`total` can differ from the paged set by a boundary row** — the page and the count use geo
  operators that describe the circle's edge slightly differently. One more reason not to render it.
- **No text or name search.** Different index, different feature. There is no `?q=`.
- **No delivery-radius awareness.** A shop 8 km away that delivers may be more relevant than one
  500 m away that does not. `catalog.deliveryType` distinguishes them and this endpoint ignores it.
- **No auto-widening** when a radius comes back empty. If that is ever added, `radiusMeters` in the
  response changes meaning — it would become "what we actually searched" rather than "what you
  asked for". That is a contract change, so it will come with a note, not silently.
- **Tags are not built.** Factor 2 of `feature.LocationBasedSearch.md`. When they land they attach
  to this same endpoint and this same flag, so plan the UI knowing a filter is coming but do not
  build against a parameter that does not exist.
- **Legacy `catalog.location` / `catalog.locationZip`** free-text fields still exist and are
  unrelated to this. So does `catalog.deliveryLocations[]`, whose subdocument spells it **`lon`, not
  `lng`**. The `Location` resource is the only source of truth for search.
