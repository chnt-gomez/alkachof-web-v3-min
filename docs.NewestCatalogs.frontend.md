# Frontend Integration Guide: Newest catalogs

**Audience:** Frontend team
**Feature:** A public showcase of the most recently opened shops — the 25 newest, newest first —
plus a freshness stamp so the list can be cached and persisted.
**Backend status:** Implemented, tested (1859 unit tests green) and verified end-to-end against a
real server. No flag; the endpoints are live as soon as the API deploys.
**API contract:** `followup.NewestCatalogsApi.md`. **Plan:** `blueprint.NewestCatalogs.md`.
**Backend rationale:** `CLAUDE.md` §X.

---

## 1. The mental model (read this first)

- **Two endpoints, both public.** `GET /newest` is the list; `GET /newest/updated` is an ~60-byte
  "did anything change?" question. Neither takes a token and both *ignore* one if sent.
- **A shop enters the showcase when its owner verifies their phone**, not when they sign up. So
  every row is a real, verified seller — but one who may not have named their shop or uploaded a
  picture yet. **Blank names and missing images are the normal case, not an error.** See §5.
- **At most 25 rows, frequently fewer.** Not a page. There is nothing to page and no "load more".
- **The list is not owned by this user**, so it cannot use the `queryClient.ts` defaults as-is —
  the same position `publicCatalog` is in. The stamp is what makes caching it safe.
- **The stamp moves when a shop is ADDED, and not when one is REMOVED.** This is the one sharp edge
  and §4 is about it.

You already have this exact pattern working for someone else's shop:
`src/sections/publicCatalog/hooks/usePublicCatalogFreshness.ts`. **Mirror it.** §3 lists the three
differences.

---

## 2. The contract

### `GET /newest`

```ts
/** One shop in the showcase. */
export type NewestCatalogRow = {
  catalogId: string
  /** The seller's shop name. CAN BE `''` — see §5. */
  alias: string
  /** Absolute url. CAN BE ABSENT — see §5. Pass through `resolveMediaUrl`. */
  image?: string
  /** When this shop entered the showcase. ISO-8601. */
  createdOn: string
}

export type NewestCatalogs = {
  catalogs: NewestCatalogRow[]
  /** The same opaque token `GET /newest/updated` returns. Only operation: `!==`. */
  updated: string
}
```

```json
{
  "catalogs": [
    { "catalogId": "64a1…c3", "alias": "Tacos Doña Mary", "image": "https://…/c1_1699999999.webp", "createdOn": "2026-10-26T14:22:31.004Z" }
  ],
  "updated": "2026-10-26T14:22:31.004Z"
}
```

### `GET /newest/updated`

```ts
export type NewestStamp = { updated: string }
```

**There is no error case on either endpoint.** No id to be unknown, no body to be malformed. An
empty showcase answers `200` with `updated: "1970-01-01T00:00:00.000Z"` — the epoch is the correct
"nothing here yet" value and is comparable like any other. Never read it as "not found".

Both responses carry `Cache-Control: public, max-age=30`, and the API guarantees the list's window
is never longer than the stamp's. So `STAMP_STALE_MS = 30_000` is the right `staleTime` here too,
for the reason your existing hook already records: anything shorter cannot learn anything, because
the browser answers it from the HTTP cache without touching the network.

### Actions

```ts
// src/sections/<wherever>/actions/fetchNewestCatalogs.ts
import { api } from '@/lib/api'

/** Unauthenticated on purpose: the route ignores a token, and sending one would
 *  queue this behind a refresh it does not need. */
export async function fetchNewestCatalogs(): Promise<NewestCatalogs> {
  return api<NewestCatalogs>('/newest', { authenticated: false })
}

export async function fetchNewestUpdated(): Promise<NewestStamp> {
  return api<NewestStamp>('/newest/updated', { authenticated: false })
}
```

---

## 3. Caching: mirror `usePublicCatalogFreshness`, with three differences

### Keys — add to `src/lib/queryKeys.ts`

Follow the shape already there, including the rule that **the stamp is a sibling of the payload, not
a child** (nested, every payload invalidation would also refetch the stamp and get the same value
back — one wasted request per change, forever):

```ts
/** The public newest-shops showcase. Not owned by this user, so it carries its
 *  own staleness contract — see the publicCatalog block above. */
newestCatalogs: () => ['newest'] as const,
/** The stamp as the server currently reports it. A SIBLING of the payload. */
newestStamp: () => ['newest', 'stamp'] as const,
/** The stamp the currently cached payload was fetched against. Persisted with it. */
newestSynced: () => ['newest', 'synced'] as const,
```

### Persistence — add to `PERSISTED_KEYS` in `src/lib/queryPersist.tsx`

```ts
queryKeys.newestCatalogs(),
queryKeys.newestSynced(),
```

**`newestStamp()` must NOT be persisted**, for exactly the reason your hook's comment gives: restored
equal to `newestSynced`, the gate would see no change and the server would never be asked — which is
the one thing this must always do. The live value has to come from the network on every cold start.

### The three differences from the catalog version

**1. No id. The keys take no argument** — there is one global list, not one per catalog.

**2. `GET /newest` carries its own stamp**, which `GET /updated/:id` does not. So set `newestSynced`
from **the payload's own `updated`**, never from the stamp query that triggered the refetch. They
will almost always agree; when they do not, the one that arrived *with the rows* is the one that
describes them. This is strictly better than the catalog pattern, which has to infer the baseline.

**3. You need a time bound as well as the stamp.** §4.

Everything else transfers unchanged, including the parts that are load-bearing:

- **`refetchOnMount: true` and `refetchOnWindowFocus: true` on the stamp query only**, overriding the
  app defaults. Without them the check is skipped on exactly the revisit it exists for.
- **On mount and focus, never on an interval.** A backgrounded tab polling a list nobody is reading
  is the waste this feature removes. (If product later wants a live-updating "new shops" ticker,
  that is a product decision with a cost, not a default.)
- **`retry: 0` on the stamp.** A failed freshness check is not evidence anything changed, so there
  is nothing to retry towards — keep serving what you have.
- **Compare for inequality, never ordering.** The stamp is the server's wall clock; `>` would pin you
  to stale data forever if it ever stepped backward, where `!==` self-heals on the next write.

---

## 4. The sharp edge: a removal does not move the stamp

> **Amendment, from the client side.** A removal is not the *only* thing the stamp misses. Because
> it is `max(createdOn)`, an **edit to a listed catalog** — the seller naming their shop or
> uploading its image — does not move it either, and that is the common case rather than the rare
> one: a shop joins the list at phone verification, before it has either. The time bound below is
> doing that work too, badly. `followup.NewestCatalogsStamp.md` is the ask to fix it at the stamp;
> `blueprint.NewestCatalogs.md` §5.3 records the reasoning.
>
> Consequence for the code below: `NEWEST_MAX_AGE_MS` **ships at 10 minutes, not the hour this
> section recommends.** The recommendation is sound for the removal case it was written for; the
> shorter value is the interim price of covering edits with a clock. It goes back up when the
> stamp ask lands.

`updated` is the newest row's `createdOn`, and **a deletion cannot move a maximum forward.** So when
a shop leaves the showcase — its owner was banned, its catalog was deleted — the stamp does not
change and a stamp-only gate will never notice.

What it costs, precisely:

- The **API** stops serving that shop the instant its owner stops being active. Nothing stale is
  ever *sent*. (The row may linger in the collection until someone prunes it; the read filters it
  out either way.)
- A **client holding a persisted copy** keeps rendering that card until the next shop is added, or
  until its own time bound expires.

**So bound the payload by time as well.** This is the same shape as the problem you already solved:
`useCatalogLocationQuery` carries a time bound of its own precisely because a location edit does not
move the catalog stamp. Use the same remedy — a `staleTime` on the **payload** query plus the
`refetchOnMount` override, which is exactly what that hook does and for the same stated reason
("overrides the app default so the bound above can actually expire"):

```ts
/** A removal does not move `updated` (§4), so the stamp alone can leave a banned
 *  shop on screen indefinitely. This is the floor that catches it. An hour is
 *  generous: the list changes a few times a day at most. */
const NEWEST_MAX_AGE_MS = 60 * 60 * 1000

useQuery({
  queryKey: queryKeys.newestCatalogs(),
  queryFn: fetchNewestCatalogs,
  staleTime: NEWEST_MAX_AGE_MS,
  // Overrides the app default so the bound above can actually expire — the same
  // override, for the same reason, as useCatalogLocationQuery.
  refetchOnMount: true,
  retry: 0,
})
```

**Do not hand-roll a `fetchedAt` field.** React Query already keeps `dataUpdatedAt`, and it is part
of the dehydrated blob — so for a *persisted* query the `staleTime` bound survives a reload on its
own. (This is the one place you get more than `useCatalogLocation` does: that query is deliberately
**not** persisted, which is why its comment notes the window "can never span a reload". Yours is
persisted, so yours does.)

The stamp gate from §3 still does the real work — it catches additions within 30 seconds. This bound
is only the backstop for removals, which is why an hour is fine and a shorter value just costs
requests.

**Do not try to detect removals properly.** There is no endpoint for it and none is planned; the API
deliberately does not fabricate a stamp movement for a deletion, because a stored stamp that can be
written by two different causes is how it starts disagreeing with the list. The time bound is the
agreed answer on both sides.

---

## 5. Rendering: assume a blank, pictureless shop

A shop enters the showcase the moment its owner verifies a phone — before they have necessarily
named it or photographed it. **This is expected and was a deliberate product decision**, so the
showcase must look finished with nothing filled in. Both fallbacks already exist:

| Field | When absent | Use |
|---|---|---|
| `alias` can be `''` | seller has not named the shop | **`publicCatalogName(alias)`** from `@/lib/catalogName` → `'Catálogo en Alkachof'`. The *public* voice, not the owner one. |
| `image` can be absent | seller has not uploaded one | **`CATALOG_PLACEHOLDER_SRC`** + **`PLACEHOLDER_BG`** from `@/lib/placeholders` |

Two things to get right:

- **Never write a fallback name back.** `catalogName.ts` explains why: a default persisted into the
  row becomes indistinguishable from a seller who chose it, and no later migration can separate
  them. These are render-time substitutions only.
- **Put `image` through `resolveMediaUrl`** from `@/lib/mediaUrl`. The API persists *absolute* image
  urls, and a row written while the backend ran without `PUBLIC_URL` holds a `localhost` origin that
  resolves only on the server's own machine. `resolveMediaUrl` repoints it; it is an identity when
  the API base is itself localhost, so it is safe in every stage.

`placeholders.ts` already notes that "a list of 25 unfilled boxes shows the item one 25 times" —
this is that list. `PLACEHOLDER_BG` behind the artwork is what keeps the letterboxing invisible.

### Linking a card

```ts
`/catalog/${row.catalogId}`
```

That is `navigationUrlService.catalogUrl` on the server, the same route every in-app deep link uses.
**Not** `/join?catalogId=…` — that one is for a cold arrival scanning a printed QR, and someone
already inside the app is not that.

---

## 6. Rate limiting — the two endpoints are metered differently, on purpose

| Endpoint | Budget |
|---|---|
| `GET /newest/updated` | **exempt.** Poll it freely; being throttled would defeat it. |
| `GET /newest` | counted by the global backstop (600 / 15 min, shared with everything else) |

This asymmetry is the whole design: the cheap question is free, the expensive answer is not. It is
also why the stamp gate matters — a client that refetches the list on every mount spends a browsing
user's budget on data that did not change.

---

## 7. Not in this contract (don't design around it)

- **No pagination, filtering or sorting.** 25 rows by recency. That is the entire API.
- **No write endpoint**, now or later. `POST /newest` is a 404 and route tests keep it that way.
- **No proximity.** This is "newest anywhere". Nearby shops are `GET /location/lookup` —
  `followup.LocationSearchApi.md` — a separate feature behind its own flag.
- **No owner opt-out.** A seller cannot remove their shop from the showcase. If product wants that,
  it is a new flag with its own endpoint (and `blueprint.OptInMapDiscoverable.md` is the pattern).
- **No item counts, no owner names, no distance.** `catalogId`, `alias`, `image`, `createdOn`.
- **No socket push.** A new shop is not an event anyone waits on; the stamp is the channel.

---

## 8. Release note

The showcase is **empty until the backend's backfill script has been run** against the environment
you point at. If `/newest` answers `{ "catalogs": [], "updated": "1970-01-01T00:00:00.000Z" }` on a
deployed box, that is the backfill not having run — not a client bug and not a flag. Worth building
the empty state anyway: it is also what a brand-new environment returns, and it is reachable in
production if every listed seller is simultaneously deactivated.
