# Frontend handoff — Catalog Image

A catalog now carries a presentation image. Two endpoints, both owner-only.

> **This file is the API-side contract of record.** The actionable frontend work plan — types,
> actions, mocks, components, and the client/server file-type mismatch to fix — lives in the web
> repo at `alkachof-web-v3-min/followup.CatalogImageApi.md`. Keep the contract sections in sync if
> the endpoints change.

## The field

`catalog.image` — a fully-qualified url string, present on every catalog response
(`GET /catalog/{catalogId}`, `GET /catalog`, …).

**The field is absent when there is no image** — not `null`, not `''`. Check for presence and render
your own placeholder; that placeholder is the prompt that gets owners to upload one, so a new
catalog is expected to look like this:

```json
{ "_id": "6a888a66feb5bfcec6916639", "alias": "my-shop", "welcomeText": "..." }
```

…and like this once an image exists:

```json
{ "_id": "6a888a66feb5bfcec6916639", "alias": "my-shop",
  "image": "https://cdn.alkachof.com/catalogs/6a888a66feb5bfcec6916639_1787333243731.png" }
```

Treat the url as opaque — it points at local dev storage, Sevalla, or an external host depending on
the environment. Never build it yourself from the catalog id.

## Upload / replace

```
POST /catalog/{catalogId}/image
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

One field, named **`image`**. JPEG or PNG, max 10 MB.

```js
const body = new FormData();
body.append('image', file);
await fetch(`/catalog/${catalogId}/image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },   // do NOT set Content-Type — the browser adds the boundary
    body
});
```

**200** → `{ "message": "Catalog image updated", "catalog": { ...,  "image": "<new url>" } }`

Posting again replaces the image; the previous file is removed server-side, so there is nothing for
the client to clean up. The response carries the whole updated catalog — use its `image` rather than
re-fetching.

## Delete

```
POST /catalog/{catalogId}/image/delete
Authorization: Bearer <token>
```

**200** → `{ "message": "Catalog image deleted", "catalog": { ... } }` — `image` is gone from the
returned catalog. **Idempotent**: calling it on a catalog with no image is also a 200, so a
double-tap or a retry needs no special handling.

## Errors

| Status | Body | When |
|---|---|---|
| 400 | `{"message":"An image file is required"}` | the request carried no file (wrong field name, or an empty form) |
| 401 | `{"message":"Auth failed"}` | missing/expired token, or the user is not active |
| 403 | `{"message":"Unauthorized"}` | authenticated, but not this catalog's owner |
| 404 | `{"message":"Catalog not found"}` | no catalog with that id |
| 500 | — | **a rejected file type or an oversized file currently lands here**, not 400 (known API gap) |

Client-side validation matters because of that last row: check type and size **before** posting, or a
user picking a PDF gets a generic server error instead of a useful message.

## Notes

- The 25-item catalog cap no longer blocks these (or any other catalog-owner endpoint) — it is
  enforced only when adding an item.
- Shop-list summaries (`GET /catalog/summaries`) still return `{ catalogId, alias }` only — no
  thumbnail. Say the word if the list UI needs one.
