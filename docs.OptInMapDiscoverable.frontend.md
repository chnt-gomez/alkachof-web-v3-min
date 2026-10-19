# Frontend Integration Guide: Opt-in map discoverability

**Audience:** Frontend team
**Feature:** Let a catalog owner decide whether their shop appears in the `/map` search. A new
boolean on the catalog's location, `is_discoverable`, with one new endpoint to set it.
**Backend status:** Implemented and tested (1777 unit tests green). This guide describes the HTTP
contract and the UX constraints that come with it — no backend code knowledge required.
**Plan:** `blueprint.OptInMapDiscoverable.md`. **Search contract:** `followup.LocationSearchApi.md`.

---

## 1. The mental model (read this first)

- A catalog is returned by `GET /location/lookup` — the one call behind the map screen — only when
  **both** of these are true: its location row holds a usable coordinate pair, **and** its owner
  has opted in.
- **The flag defaults to `false`.** A catalog that already has a pin is *not* on the map until its
  owner turns this on. That includes every catalog that exists today.
- **It lives on the `Location` resource**, not on the catalog, so it arrives on the payload you
  already read from `GET /location/catalog/{catalogId}`.
- **Opting in is one tap and takes effect immediately.** There is no review and no delay.

### What "off" does and does not do

This is the part most likely to be mis-worded in the UI, so it is the part to get right first.

| Opting out **does** | Opting out does **not** |
|---|---|
| remove the shop from map-search results | make the catalog private |
| | hide the catalog's URL, shared link or QR |
| | hide the address — `GET /location/catalog/{id}` is **public and ungated**, so the exact pin and full street address stay readable by anyone holding the catalog id |
| | affect the shop's own page, which still shows its location dialog |

**So do not call this privacy.** Words like *privado*, *oculto* or *ubicación privada* promise
something the API does not deliver, and a seller will hold us to the copy. "No aparecerás en el
mapa" is both true and the whole truth. The destructive "take my address out of the product"
action is still the two-null coordinate update in `followup.LocationSearchApi.md` §7, and it is a
different control.

This scope is **settled, not provisional**: the flag governs the map and only the map. A seller
already knows their catalog displays its location — they chose to publish it — so there is no
expectation to manage here beyond wording the toggle honestly.

One more consequence of the public read: **anyone can see whether a shop opted in.** Harmless, but
do not build anything that assumes the flag is secret.

---

## 2. Reading the flag

No new endpoint. The field is on the `Location` response of both reads:

```
GET /location/catalog/{catalogId}      public
GET /location/{locationId}             public
```

```jsonc
{
  "location": {
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
    "is_discoverable": false,   // <- NEW. Always present, always a boolean.
    "zoneId": null
  }
}
```

- **It is always present and always a boolean**, including on rows written before the field
  existed — the schema default means a legacy document reads back `false`. You do not have to
  defend against `undefined`, though reading it as `=== true` costs nothing and is what we would
  do.
- `GET /location/catalog/{catalogId}` still answers `{ "location": null }` for a catalog with no
  location at all. That case has **no flag to show** — see state 1 below.

---

## 3. Setting the flag

```
POST /location/{locationId}/discoverable
```

- **Auth required**, and the caller must be the catalog owner: `Authorization: Bearer <token>`.
- `{locationId}` is `location._id` from the read above — **not** the catalog id.

### Request body

```jsonc
{ "is_discoverable": true }   // or false
```

**A real JSON boolean.** `"true"`, `1` and `null` are all a `400`. We do not coerce, deliberately:
coercion is how the string `"false"` becomes `true` and silently publishes someone's home address.

### Responses

| Status | Meaning | What to do |
|---|---|---|
| `200` | Updated. Body is `{ message, location }` with the **full updated location** | Write the returned row into your cache. No refetch needed. |
| `400` | `is_discoverable` missing or not a boolean | A client bug. Should never reach a user. |
| `401` | Not authenticated | Normal auth handling. |
| `403` | Not the catalog owner | Should be unreachable from your own editor. |
| `409` | **The location has no indexable coordinates**, so it cannot be listed | Show your own Spanish copy: *"Agrega una ubicación en el mapa antes de aparecer."* |

```
POST /location/64a1b2c3d4e5f6a7b8c9d0f2/discoverable
Authorization: Bearer <jwt>
Content-Type: application/json

{ "is_discoverable": true }
→ 200 { "message": "Discoverability updated", "location": { ... "is_discoverable": true } }
```

> ⚠️ **Key the 409 copy off the status, not the message.** Every `message` this API returns is
> English (`"A location with valid coordinates is required before a catalog can be discoverable"`),
> and this is one a *seller* reads. Rendering it verbatim puts English in a Spanish-only UI. The
> status is the stable contract; the string is for your logs.

### Two asymmetries worth knowing

- **Turning it ON requires a usable pin; turning it OFF never does.** A seller can always leave
  the map, from any state — including the broken ones they would most want out of. So never gate
  the "off" path on your own coordinate check.
- **Turning it on also repairs an old row.** A location placed before the search index existed
  holds coordinates but was never indexed, and is invisible for a reason its owner cannot see.
  Opting in re-derives the point, so the shop appears immediately. You do not have to ask the
  seller to re-save their address first, and you should not suggest it.

---

## 4. The flag is NOT settable anywhere else

This is a deliberate hole in the API surface and the most important line in this document:

- `POST /location/catalog/{catalogId}` (create) **ignores** `is_discoverable`. A new location is
  never born discoverable.
- `POST /location/{locationId}/update` (the address form) **ignores** `is_discoverable`.

The reason is the bug it prevents. An address form posts every field it holds; if the flag were
accepted on `/update`, a seller fixing a typo in their street would post the form's stale copy of
it and silently leave the map — with a `200` on the way out and nothing in the UI to show it. The
API refuses the key, so the bug cannot be written.

**Your side of that bargain:** keep `is_discoverable` out of your address-form payload type
entirely, so no form body can carry it. One narrow function that posts `{ is_discoverable }` and
nothing else is the shape we'd suggest, and a test asserting the address save sends no such key is
cheap insurance.

---

## 5. The three states your control must render

```
1. no location row, or no usable coordinates  ->  control visible, DISABLED, + the reason
2. coordinates on file, is_discoverable false ->  control OFF, enabled      <- everyone, day one
3. coordinates on file, is_discoverable true  ->  control ON,  enabled
```

- **State 1 should be rendered, not hidden.** A hidden control teaches nobody that the map exists.
  A visible disabled one, beside the "add a location" affordance that fixes it, teaches both at
  once.
- **State 2 is where every existing seller starts**, so this is the state the UI will be in for
  almost everyone on day one.
- You can detect state 1 client-side from `location === null` or an out-of-range `lat`/`lng`, which
  saves a round trip. Treat that as courtesy only: what search actually indexes is a derived field
  we do not expose, so the `409` remains the real answer and must still be handled.

Suggested copy, as a starting point rather than a mandate (es-MX):

| Element | Text |
|---|---|
| Label | `Permitir que me encuentren en el mapa` |
| Hint, on | `Tu catálogo aparece cuando alguien busca catálogos cerca de tu ubicación.` |
| Hint, off | `Tu catálogo no aparece en el mapa. Tu enlace y tu código QR siguen funcionando igual.` |
| Hint, disabled | `Agrega una ubicación con un punto en el mapa para poder aparecer.` |
| On 409 | `Agrega una ubicación en el mapa antes de aparecer.` |
| Toast, enabled | `Ya apareces en el mapa.` |
| Toast, disabled | `Ya no apareces en el mapa.` |

If you flip the control optimistically, a toast is the only thing that distinguishes a write that
landed from one that failed — the control has already moved by then.

---

## 6. Nothing about the map screen changes

`GET /location/lookup` keeps its exact request and response shape. The only difference is that it
returns fewer rows. Specifically:

- **`results.length` is still the number to display, and `total` still must not be rendered** —
  the reasoning in `followup.LocationSearchApi.md` §5 is unchanged.
- `truncated` remains the only honest "there is more".
- A seller who opts out while a buyer has the map open **stays drawn** until the client's next
  lookup. That is expected: the circle lives in client memory, and the next pan past its edge
  refreshes it. There is no push for this and none is planned.

---

## 7. The rollout, and why the map goes quiet first

**Turning this on empties the map, and that is the intended outcome.** The flag defaults to
`false`, so every catalog visible on the map today leaves it when the API deploys, and stays off
until its owner opts in.

**There is no backfill and none is coming.** Not even for the rows that are already indexed and
would therefore be "no worse off" than today. The position is that privacy and security come
before our own distribution, and that **no user is ever opted into being published by default** —
so the one-time script sketched in the blueprint will not be written. Do not build the client on
any assumption that sellers arrive already listed.

The order is **backend first, then this client, then the announcement**:

1. the API deploys and the map empties — `/lookup` still answers `200`, with fewer rows, and
   nothing errors;
2. this client deploys and sellers get the control;
3. sellers are told on the **news board**.

Backend-first is deliberate: the inverse gives you a toggle whose endpoint 404s, which is the one
ordering that generates support tickets. This one gives a quiet map for the length of one deploy.

None of that sequence is client work, but it is worth knowing why your toggle will read `false`
for literally every seller on day one — handing them the switch is step 2's whole job.

---

## 8. Quick reference

| What | Where |
|---|---|
| Read the flag | `GET /location/catalog/{catalogId}` → `location.is_discoverable` |
| Set the flag | `POST /location/{locationId}/discoverable`, body `{ "is_discoverable": bool }`, Bearer auth, owner only |
| Not settable | create, and `/update` — by design (§4) |
| Needs a pin | only to turn **on**; `409` otherwise |
| Off means | not in map search. **Not** private, not hidden, address still public (§1) |
| Swagger | `Location`, `SetDiscoverableRequest`, `/location/{locationId}/discoverable` (`/api-docs`, non-prod) |

## 9. Decided, so you do not have to ask

All settled on 2026-10-19. Recorded here because each one reads like an open question when you
come to the feature cold.

1. **No backfill, ever** — §7. Nobody is opted in by default.
2. **Backend deploys first**, then this client, then the news announcement — §7.
3. **"Off" means the map and only the map** — §1. The address stays public and that is not in
   question.
4. **No dashboard prompt** nudging an unplaced or unlisted seller. A position, not a backlog item:
   the catalog is the seller's own sandbox, and the job is to hand them working tools rather than
   chase them through their own settings. Show the state and the way to change it; what they do
   with it is theirs.
5. **A checkbox, not a switch** — §5, matching every other boolean in the editor.

One thing genuinely remains open and is not a blocker: **the freshness stamp does not move** when
this flag changes, the same way it does not move when a location is edited
(`followup.CatalogLocationStamp.md` is the ask). Harmless while the only reader is the owner's own
editor — worth knowing before you cache the flag anywhere else.
