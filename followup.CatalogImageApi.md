# Follow-up: Catalog Image API — Frontend Handoff

A catalog can now carry a presentation image. This document is the contract plus the specific work
items on the web client side, written against the code already in this repo.

## Summary

`catalog.image` is a url string on every catalog response. Two owner-only endpoints upload/replace
it and remove it. The API stores the file and hands back a url — the client never builds one.

**The field is absent when there is no image** — not `null`, not `''`. That is deliberate: a fresh
catalog has no `image` key at all, and the UI is expected to render its own placeholder, which is
what prompts the owner to upload one. Type it as **optional**, and branch on presence.

```jsonc
// new catalog — no key
{ "_id": "6a888a...", "alias": "Mi Tienda", "welcomeText": "..." }

// after an upload
{ "_id": "6a888a...", "alias": "Mi Tienda",
  "image": "https://cdn.alkachof.com/catalogs/6a888a..._1787333243731.png" }
```

Treat the url as opaque — depending on environment it points at local dev storage, Sevalla, or an
external host. Never derive it from the catalog id.

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/catalog/{catalogId}/image` | Bearer + catalog owner | Upload or replace — multipart, field **`image`** |
| `POST` | `/catalog/{catalogId}/image/delete` | Bearer + catalog owner | Remove the image |

Both respond `200 { message, catalog }` where `catalog` is the **full updated catalog** — use it
directly, no refetch needed.

Replacing deletes the previous file server-side; there is nothing for the client to clean up. The
filename carries a timestamp, so a replaced image gets a brand-new url and **no cache-busting query
param is needed** — do not append one.

`POST /image/delete` is **idempotent**: calling it on a catalog with no image is also a `200`. A
double-tap or a retry needs no special handling.

### Errors

| Status | Body | When |
|---|---|---|
| 400 | `{"message":"An image file is required"}` | no file in the request (wrong field name, empty form) |
| 401 | `{"message":"Auth failed"}` | missing/expired token, or user not active |
| 403 | `{"message":"Unauthorized"}` | authenticated but not this catalog's owner |
| 404 | `{"message":"Catalog not found"}` | no catalog with that id |
| 500 | — | **rejected file type or oversized file** (known API gap — see below) |

## ⚠️ Read this before wiring the picker: a real client/server mismatch

`src/components/ImageUploadField.tsx` currently validates:

```ts
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024
```

The API accepts **JPEG and PNG only** (`image/jpeg`, `image/jpg`, `image/png`) up to **10 MB**. Two
consequences:

1. **WebP passes client validation and then fails on the server.** Worse, the API's multer errors
   surface through the global handler as a **500**, not a 400 — so the user picks a `.webp`, waits,
   and gets a generic server error with no useful message. This is not new to the catalog image:
   **profile pictures and item images have the same latent bug today** via the same component.
2. The 5 MB client limit is stricter than the server's 10 MB, which is harmless — it just rejects
   some files the server would have accepted.

**Recommended fix (client-side, small):** drop `'image/webp'` from `ACCEPTED_TYPES` so the component
rejects it up front with the existing Spanish message, and raise `MAX_BYTES` to 10 MB to match. That
fixes catalog, profile, and item uploads in one edit. If product wants WebP support, that is an API
change (`api/util/storageFactory.js` `fileFilter`) — ask, do not work around it client-side.

## Work items

### 1. Type — `src/sections/publicCatalog/actions/fetchPublicCatalog.ts`

Add to the `Catalog` type. **Optional, because the key is absent when unset:**

```ts
export type Catalog = {
  // ...
  /** Presentation image url. Absent when the owner has not uploaded one. */
  image?: string
}
```

Every consumer that reads it should treat absence as "show placeholder" (`catalog.image ?? ''` where
a string is required — `ImageUploadField` takes `value: string`).

### 2. Actions — `src/sections/catalog/actions/`

Two new files, following the existing shape of `updateCatalog.ts` / `uploadProfileImage.ts`. Note
`api()` already detects a `FormData` body and **omits `Content-Type` so the browser can set the
multipart boundary** (`src/lib/api.ts`) — use `api()`, never a hand-rolled `fetch`, or the boundary
is lost and the server sees no file (→ 400).

```ts
// uploadCatalogImage.ts
import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockUploadCatalogImage } from '@/mocks'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'

export async function uploadCatalogImage(catalogId: string, file: File): Promise<Catalog> {
  if (IS_DEV_STAGE) return mockUploadCatalogImage(catalogId, file)
  const form = new FormData()
  form.append('image', file)
  const { catalog } = await api<{ catalog: Catalog }>(`/catalog/${catalogId}/image`, {
    method: 'POST',
    body: form,
  })
  return catalog
}

// deleteCatalogImage.ts — same shape, no body
//   api<{ catalog: Catalog }>(`/catalog/${catalogId}/image/delete`, { method: 'POST' })
```

Returning the whole `Catalog` (rather than just the url, as `uploadProfileImage` does) keeps the
caller's cached catalog in sync in one step — worth the small divergence from the profile action.

### 3. Mocks — `src/mocks/`

Per the mock rules in `CLAUDE.md`: one file per action, import the real type, re-export from
`src/mocks/index.ts`. `mockUploadCatalogImage` should return a catalog whose `image` is
`URL.createObjectURL(file)` (same trick as `mockUpdateItem`); `mockDeleteCatalogImage` returns one
with `image` omitted. Spanish for any user-visible strings.

Also add `image` to the existing catalog mocks so the dev stage exercises both states —
`mockFetchPublicCatalog` / `mockFetchMyCatalog` / `mockFetchEditableCatalog` with an image,
`mockUpdateCatalog` passing it through.

### 4. Owner UI — `src/sections/catalog/components/EditCatalogScreen.tsx`

Add an image section next to the existing fields, reusing `ImageUploadField` in **upload-now mode**
(the profile pattern in `src/sections/profile/ProfilePage.tsx:52`), since the endpoint persists
immediately and is independent of the form's save button:

```tsx
<ImageUploadField
  value={catalog.image ?? ''}
  onChange={() => { /* context update — see below */ }}
  upload={async (file) => (await uploadCatalogImage(catalog._id, file)).image ?? ''}
  alt={catalog.alias || 'Catálogo'}
  placeholder="Toca para agregar imagen del catálogo"
/>
```

`ImageUploadField` has **no remove affordance** today — it can only replace. The delete endpoint
therefore needs one. Add an **optional** `onDelete?: () => Promise<void>` prop (rendered only when
provided, so profile and item usage is untouched), rather than building a one-off control in the
catalog screen. Keep its error handling in the component's existing `setError` path.

Because the upload persists immediately while the rest of the form is deferred, make sure the
catalog held in `EditCatalogContext` is updated from the action's response — otherwise a subsequent
"save" of the other fields will re-render with a stale (image-less) catalog.

### 5. Display sites

The image is presentational; add it where a catalog is already identified by `alias`:

- `src/sections/publicCatalog/components/CatalogJumbotron.tsx` — the public shop header, the main
  payoff for the feature.
- `src/sections/home/components/MyCatalogCard.tsx` and `SavedCatalogList.tsx`, and
  `src/sections/catalogs/components/CatalogCard.tsx` — cards. **But see the caveat below.**
- `src/sections/catalog/components/CatalogHeader.tsx` — owner's view.

Each needs a placeholder for the absent case; that placeholder is the feature's call to action for
owners, so make it inviting rather than a broken-image box.

**Caveat for list/card views:** `GET /catalog/summaries` returns `{ catalogId, alias }` only — **no
image**. Cards fed by summaries cannot show a thumbnail without an extra per-catalog fetch (don't —
that's an N+1). If the design calls for thumbnails in lists, say so and the API will add `image` to
the summary shape; that is a small backend change.

### 6. Tests

Page-level per `CLAUDE.md`: render the page in a `MemoryRouter`, `vi.mock` the action modules, assert
on DOM output. Worth covering: a catalog without an image renders the placeholder; a successful
upload renders the returned url; a non-owner never sees the upload/delete affordance; delete returns
the view to the placeholder state.

## Notes

- Only the catalog **owner** may call either endpoint — gate the affordances on ownership in the UI
  too, so a visitor never sees a control that would 403.
- The 25-item catalog cap no longer blocks catalog-owner endpoints (it now only applies when adding
  an item), so a full catalog can change its image. If you previously worked around
  `"Max items reached"` on catalog update, that workaround can go.
- Backend reference: `CLAUDE.md` §U (Catalog Image) and §H (upload stack) in `alkachof-api`.
