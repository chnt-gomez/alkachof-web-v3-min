# Follow-up: Catalog Freshness Stamp — Frontend Handoff

This document hands `GET /updated/{catalogId}` to the web client team. It mirrors the OpenAPI
definition now live in Swagger (`/api-docs`, non-prod only).

## Summary

Every catalog now has **one timestamp that moves whenever anything a visitor can see about it
changes** — its metadata, its image, its QR, any of its items, and any question asked or answered on
it. Reading that timestamp is the cheapest request in the API: one indexed lookup, ~80 bytes, no
auth.

The point is to stop refetching a shop that has not changed. A returning visitor currently pays for
`GET /catalog/{id}` + `GET /catalog/{id}/items` (+ questions) on every visit; with this they pay for
one stamp read and render from cache.

## Why this exists — it unblocks a decision already recorded in `queryPersist.tsx`

`PERSISTED_KEYS` deliberately holds the catalog back today, and the comment says exactly why:

> The owner's catalog and its items are held back on purpose. With our defaults a persisted list
> never refetches, so a product deleted on another device would keep rendering here indefinitely —
> and the catalog is the surface buyers see.

That is the problem this endpoint solves. A persisted list *can* now refetch, cheaply and only when
something actually changed, so the allowlist can grow. `queryKeys.ts` makes the same call ("anything
owned by somebody else — the public catalog, questions … is deliberately absent"), for the same
reason, and the same reasoning now unblocks.

**Note the public catalog is not on React Query at all today.** `PublicCatalogContext.tsx` loads it
with `useState` + `useEffect` + `Promise.all`, so there is no cache to invalidate yet. Moving it onto
the query client is the prerequisite step — see *Suggested implementation*.

## The endpoint

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/updated/{catalogId}` | **none — public** | Freshness stamp for a catalog's public data |

Mounted at the top level, not under `/catalog`, so it can be rate-limit- and CDN-scoped on its own.

### Response — always `200`

```json
{
  "catalogId": "64a1b2c3d4e5f6a7b8c9d0c3",
  "updated": "2026-09-08T14:22:31.004Z"
}
```

```
Cache-Control: public, max-age=30
```

### There is no error case to handle

**An unknown catalog, a deleted catalog and a malformed id all answer `200` with the epoch**
(`1970-01-01T00:00:00.000Z`). There is no `404`, no `400`, no auth failure. A catalog that exists but
has never been modified answers the epoch too, and that is not an error either — it is the correct
"nothing has happened here yet" value, and it is comparable like any other.

So: no `try`/`catch` branch for status codes, no `ApiError` handling beyond the network-failure case
you already have. On a network failure, **keep serving the cache** — a failed freshness check is not
evidence that anything changed.

## Rules that matter to the client

**1. Compare for inequality, never ordering.**

```ts
if (stamp.updated !== cached.updated) refetch()   // yes
if (stamp.updated  >  cached.updated) refetch()   // NO
```

The stamp is the server's wall clock. If that ever steps backward (an NTP correction, a host
migration), `>` pins the client to stale data permanently, while `!==` self-heals on the next write.
You want "changed", not "newer".

**2. Store the stamp *with* the payload, in the same cache entry, written at the same time.** A cache
holding items from one fetch and a stamp from another is worse than no cache — it is a stale cache
that believes it is fresh.

**3. Keep a hard maximum cache age regardless of the stamp.** The server's stamp write is
best-effort: if it ever fails, that catalog's subscribers stay on cached data until its *next*
successful mutation, and nothing surfaces it. `MAX_AGE_MS` (24h) in `queryPersist.tsx` already gives
you this floor — keep it.

**4. One stamp covers metadata, items and questions together.** Any change refetches all of them.
That is deliberate: two stamps would double the poll to save a refetch that is already rare, and the
three are usually edited in the same session. Do not ask for per-item stamps; they do not exist.

**5. Polling faster than 30s buys nothing.** `max-age=30` is browser-cacheable, so a `fetch` inside
that window is served from the HTTP cache without touching the network. Poll at **60s or slower**, or
on focus/visibility rather than a bare interval — a backgrounded tab polling a shop nobody is looking
at is the waste this feature exists to remove. A change is visible within 30s of being made; that is
the intended trade.

## What moves the stamp

| Change | Endpoint the seller (or visitor) hit |
|---|---|
| Catalog metadata edited | `POST /catalog/{id}/update` |
| Catalog image uploaded / replaced / deleted | `POST /catalog/{id}/image`, `/image/delete` |
| QR code first minted | (server-side, on the owner's first `GET /catalog`) |
| Item created | `POST /catalog/{id}/new`, `/item/add`, Instagram import |
| Item updated | `POST /item/{itemId}/update` |
| Item deleted | `POST /item/{itemId}/delete` |
| **Question asked** — by any visitor, not just the owner | `POST /catalog/{id}/ask` |
| Question answered or flagged | `POST /catalog/{id}/question/{qId}/answer` |

Deliberately **not** stamped: catalog creation (nothing to invalidate yet — it reads epoch until the
first real change), a rejected write of any kind, and deleting a catalog image that was not there.

**Still not covered: the catalog's Location** (`/location/catalog/{catalogId}`). Editing it does
*not* move the stamp today. If `CatalogLocationDialog` renders from a cached location, keep fetching
that one normally until this is wired up — it is a small backend change, ask for it.

## Suggested implementation

Four steps, in order. Steps 1–2 are the real work; 3–4 are small.

### 1. Move `PublicCatalogContext` onto the query client

Nothing can be cached until the public catalog lives in React Query. Replace the `useState` +
`Promise.all` in `src/sections/publicCatalog/context/PublicCatalogContext.tsx` with `useQuery` calls
wrapping the existing `fetchPublicCatalog` / `fetchCatalogItems` / `fetchCatalogQuestions` actions —
those stay exactly as they are.

**These entries must not inherit `queryClient.ts`'s defaults.** Those defaults (`staleTime:
Infinity`, no refetch on mount/focus/reconnect) are documented as being for *owner-owned rows that
change only through mutations this client performs*. The public catalog is written by someone else,
so give it its own `staleTime` — and the freshness gate below is what that `staleTime` is for.

### 2. Add the keys, and the freshness gate

New keys in `src/lib/queryKeys.ts`:

```ts
/** A public catalog someone else owns, keyed by id. */
publicCatalog: (catalogId: string) => ['catalog', 'public', catalogId] as const,
publicCatalogItems: (catalogId: string) => ['catalog', 'public', catalogId, 'items'] as const,
publicCatalogQuestions: (catalogId: string) => ['catalog', 'public', catalogId, 'questions'] as const,
/** The freshness stamp that gates all three above. */
catalogUpdated: (catalogId: string) => ['catalog', 'public', catalogId, 'updated'] as const,
```

The hierarchy is doing real work: `['catalog','public',catalogId]` is a prefix that invalidates the
catalog, its items and its questions in one call — which is exactly the granularity the stamp has.

One wrinkle to know: that prefix also matches the stamp key nested under it, so a blanket invalidate
refetches the stamp as well. Harmless — it comes back with the same value and the effect below does
not re-fire — but it is a wasted request per change, so either invalidate the three payload keys
explicitly or give the stamp a sibling key (`['catalog','public',catalogId,'stamp']` outside the
payload prefix) if you prefer one call.

A new action, `src/sections/publicCatalog/actions/fetchCatalogUpdated.ts`, mirroring the others
(including the `IS_DEV_STAGE` branch):

```ts
export type CatalogStamp = { catalogId: string; updated: string }

export async function fetchCatalogUpdated(catalogId: string): Promise<CatalogStamp> {
  if (IS_DEV_STAGE) return mockFetchCatalogUpdated(catalogId)
  return api<CatalogStamp>(`/updated/${catalogId}`, { authenticated: false })
}
```

Then the gate — poll the stamp, and invalidate the subtree when it changes:

```ts
const { data: stamp } = useQuery({
  queryKey: queryKeys.catalogUpdated(catalogId),
  queryFn: () => fetchCatalogUpdated(catalogId),
  staleTime: 30_000,          // matches the server's max-age; a shorter one cannot learn anything
  refetchInterval: 60_000,    // or drop this and refetch on focus/visibility instead
  refetchOnWindowFocus: true,
})

const seen = useRef<string>()
useEffect(() => {
  if (!stamp) return
  if (seen.current !== undefined && seen.current !== stamp.updated) {
    void queryClient.invalidateQueries({ queryKey: ['catalog', 'public', catalogId] })
  }
  seen.current = stamp.updated
}, [stamp?.updated, catalogId])
```

Whatever shape you land on, the invariant is rule 2: the stamp you compare against must be the one
that was current when the payload was fetched.

### 3. Extend the persistence allowlist

With the gate in place, add the three public-catalog keys to `PERSISTED_KEYS` in
`src/lib/queryPersist.tsx`, and update the comment — the "held back on purpose" note is what this
work retires. The stamp key itself can be persisted too (it is tiny and it is what makes a restored
entry verifiable), but persisting the payloads without the gate would reintroduce exactly the bug
that comment describes.

Persisting per-catalog entries means the blob grows with how many shops a visitor has opened. Worth
a cap or an LRU if that turns out to matter; not worth pre-solving.

### 4. Add the dev-stage mock

`src/mocks/mockFetchCatalogUpdated.ts`, exported from `src/mocks/index.ts`. Have the existing mock
stores (`mockCreateItem`, `mockUpdateItem`, `mockDeleteItem`, `mockUpdateCatalog`, `mockAskQuestion`,
`mockAnswerQuestion`, `mockUploadCatalogImage`, …) bump a module-level date, so the dev stage
exercises the invalidation path rather than a frozen constant. A mock that always returns the same
string makes the whole gate untestable by hand.

## Gotchas

- **Do not send an `Authorization` header.** Harmless if you do — the route ignores it — but the
  action should use `authenticated: false` like its siblings, or a logged-out visitor's request will
  be delayed behind a token refresh that this call does not need.
- **Do not treat the epoch as "catalog not found".** Use `GET /catalog/{id}`'s own 404 for that. A
  real, live catalog reads the epoch until its first edit.
- **Do not build a link or a key from `updated`.** It is an opaque comparison token; the only
  operation on it is `!==`.
- **Do not poll on a bare interval in a background tab.** Gate on visibility.
- **Do not use this to decide whether to show a "new items!" badge.** The stamp says *something*
  changed, not what — a typo fix in the welcome text moves it exactly as much as five new products.

## Not covered, deliberately

- **Per-item or per-section stamps.** One number for the whole shop. Finer invalidation needs a
  different backend design; ask if the full-list refetch turns out to be the bottleneck.
- **The catalog's Location** (above).
- **A push signal.** This is polling by design. The `/live` socket carries notifications, not catalog
  changes, and adding catalog events there is a separate decision.
- **Anything on the owner's own dashboard.** The owner performs the mutations, so their client
  already knows; this endpoint is for *other people's* copies of a shop.

Backend detail, plan and rationale: `blueprint.LocalCache.md`.
