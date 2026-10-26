# Blueprint — Newest catalogs showcase (Comprar)

**Status:** implemented. This is the design record; `CLAUDE.md` holds the operative rules (§11
lists the edits it took).
**Source:** `feature.NewestCatalogs.md`.
**Contract:** `docs.NewestCatalogs.frontend.md` — the backend handover. The API is implemented and
live; there is no flag.
**Scope:** one new block on Home's **Comprar** tab, two new public reads, three new cache keys, one
new persisted key. **No route, no page, no section folder, no mutation.**

The backend's own plan is also called `blueprint.NewestCatalogs.md` and lives in `alkachof-api`.
This file is the client half; where the two disagree, §4 and §5.3 say so explicitly.

---

## 1. What it is

A public showcase of the 25 most recently opened shops, newest first, rendered as a list under
**Catálogos guardados** on the Comprar tab of Home.

```
ComprarPanel
├─ <MapSearchCard />              # unchanged — the doorway into /map
├─ Catálogos guardados            # unchanged — the shops this user follows
└─ Catálogos nuevos               # NEW — the 25 newest shops on the platform
```

It answers the empty-state problem Comprar has today: a user with no subscriptions and no shop
nearby sees a dashed box telling them they have nothing, and a map that may be empty in their
colonia. The showcase is the one block on that tab that always has something in it.

Two things make it cheap enough to put on a tab people open constantly:

- **One request returns every row it needs.** The payload carries the name and the image — §4.
- **A ~60-byte question gates the refetch.** `GET /newest/updated` is the same stamp pattern
  `publicCatalog` already uses, and it is what makes a list this client does not own cacheable at
  all — §5.

---

## 2. Where the code lives

**In `src/sections/home/`, not a new section.** There is no page and no route, so a
`src/sections/newestCatalogs/` folder would be the `requests` exception (§"Service requests" in
`CLAUDE.md`) invoked for a single list with a single consumer. The news feed is the precedent that
fits exactly: an admin-owned, read-only, pull-only block whose fetch lives in
`sections/home/actions/` and whose list component lives in `sections/home/components/`.

```
src/sections/home/
├── actions/fetchNewestCatalogs.ts      # NEW — both reads + both types
├── hooks/useNewestCatalogs.ts          # NEW — the two queries, the gate, the section adapter
├── components/NewestCatalogList.tsx    # NEW — presentational; rows + empty state
├── components/ComprarPanel.tsx         # one added section
└── HomePage.tsx                        # one added hook call, one added prop
```

Touched outside the section:

```
src/lib/queryKeys.ts        # three keys + the block comment that explains them
src/lib/queryPersist.tsx    # one key added to PERSISTED_KEYS, and a note on the two held back
```

If the showcase ever grows a route of its own — a full "explorar" page — that is the moment to
promote it to `src/sections/newestCatalogs/`, and the move is mechanical. It does not need to
happen first.

---

## 3. The reads

```ts
// src/sections/home/actions/fetchNewestCatalogs.ts
import { api } from '@/lib/api'

/** One shop in the showcase. */
export type NewestCatalogRow = {
  catalogId: string
  /** The shop's name. **Can be `''`** — a shop enters the showcase when its owner
   *  verifies a phone, which is before they have necessarily named it. See §6. */
  alias: string
  /** Absolute url, minted by the API. **Can be absent.** Through `resolveMediaUrl`. */
  image?: string
  /** When this shop entered the showcase. ISO-8601. */
  createdOn: string
}

export type NewestCatalogs = {
  catalogs: NewestCatalogRow[]
  /** The stamp these rows were built from. The only operation on it is `!==`. */
  updated: string
}

export type NewestStamp = { updated: string }

/**
 * Unauthenticated on purpose: the route ignores a token, and sending one would
 * queue this behind a `/refresh` it does not need.
 */
export async function fetchNewestCatalogs(): Promise<NewestCatalogs> {
  return api<NewestCatalogs>('/newest', { authenticated: false })
}

export async function fetchNewestUpdated(): Promise<NewestStamp> {
  return api<NewestStamp>('/newest/updated', { authenticated: false })
}
```

**Neither endpoint has an error case.** There is no id to be unknown and no body to be malformed.
An empty showcase answers `200` with `updated: "1970-01-01T00:00:00.000Z"`; the epoch is an
ordinary comparison token and must never be read as "not found". The only failure either call can
produce is a network one, and §5.5 says what happens then.

---

## 4. There is no follow-up call

**One request is the whole list.** `GET /newest` returns `alias`, `image` and `createdOn` on every
row (contract §2), which is everything a card shows.

This is the one place where the ask and the shipped API diverged: the feature note was written
expecting rows of bare ids and a follow-up read per catalog, and the backend handover closed that
gap before any of this was built. The note has been corrected in place, so nothing in the corpus
still asks for the fan-out — but it is the easiest mistake to make here, so:

**Do not fan out `GET /catalog/:id` per row.** It would be 25 requests against the global
600 / 15 min backstop for data already in hand, none of them covered by the stamp gate — the
freshness question would answer "nothing changed" while 25 uncovered reads ran anyway. The whole
economy of this feature is one gated request.

The row deliberately carries nothing else — no item count, no owner name, no distance, no
description (contract §7). A card wanting any of those is a change to the API, not a second call
from here.

---

## 5. Caching

Mirror `src/sections/publicCatalog/hooks/usePublicCatalogFreshness.ts`. It is the same situation:
a payload **this user does not write**, which therefore cannot take the `queryClient.ts` defaults
(`staleTime: Infinity`, no refetch triggers — written for rows that only change through mutations
this client performs), made cacheable by a cheap stamp.

### 5.1 The keys

```ts
// src/lib/queryKeys.ts — a new block after the publicCatalog one

/* --- The newest-shops showcase -----------------------------------------
 *
 * Public, global, and not owned by this user — the same position the public
 * catalog is in, so the same shape of answer: a ~60-byte `GET /newest/updated`
 * is what makes the list cacheable, and a time bound catches what the stamp
 * cannot see (a removal — see `useNewestCatalogs`).
 *
 * Nested under one root for readability only. The three are **siblings**: the
 * list's key is `['newest','list']`, not `['newest']`, because
 * `invalidateQueries` matches by prefix — keyed at the root, every list
 * invalidation would also refetch the stamp and get the same value back, which
 * is one wasted request per change, forever.
 */
/** The 25 rows, plus the stamp they were built from. The only persisted one. */
newestCatalogs: () => ['newest', 'list'] as const,
/** The stamp as the server currently reports it. Never persisted — see below. */
newestStamp: () => ['newest', 'stamp'] as const,
/** The live stamp the gate has already refetched against. A loop guard, not a
 *  baseline — §5.4. Never persisted. */
newestChecked: () => ['newest', 'checked'] as const,
```

The handover's §3 snippet uses `['newest']` for the list. Taking it literally would make the stamp
a prefix-child of the payload and reintroduce the exact waste its own comment warns about; the
catalog keys avoid this by construction (`['catalog','public',id]` vs `['catalog','stamp',id]` are
genuinely siblings). `['newest','list']` restores that property. Belt and braces, the gate also
passes `exact: true` (§5.4) — with one payload there is no subtree to invalidate.

### 5.2 Persistence

```ts
// PERSISTED_KEYS in src/lib/queryPersist.tsx
queryKeys.newestCatalogs(),
```

**Only the list.** Adding a key here is a decision about staleness, so, for the record:

- The list **is** safe on disk, because it is gated two ways — the stamp catches an addition within
  30 seconds of the next mount or focus, and the hour bound catches a removal (§5.3).
- Its `image` urls are minted and served by the API itself, so this is not the "built on a
  third-party CDN url" case the allowlist forbids. The public catalog payloads already persist the
  same kind of url.
- **`newestStamp()` must not be persisted**, for the reason `usePublicCatalogFreshness` already
  records: restored, it would equal the payload's own stamp, the gate would see no change, and the
  server would never be asked — which is the one thing this must always do. The live value comes
  from the network on every cold start.
- **`newestChecked()` must not be persisted** either. It is a note about a live stamp, so
  persisting it would silence the gate in exactly the case it exists for, and costs at most one
  request per cold start to rebuild.

Note the blob is dropped on every session end (`logout`, the 401 give-up path, a `storage` event
from another tab). The showcase is public data that says nothing about who was signed in, so
nothing here needs that — but it is the existing boundary and this feature does not get an
exemption from it. The cost is one refetch after a logout.

### 5.3 The hour bound, and the sharp edge it covers

`updated` is the newest row's `createdOn`, and **a removal cannot move a maximum forward**. When a
shop leaves the showcase — its owner banned, its catalog deleted — the stamp may not move at all,
and a stamp-only gate would never notice. The API stops *serving* that shop immediately; nothing
stale is ever sent. But a client holding a persisted copy keeps drawing that card until the next
shop is added.

So the payload is bounded by time as well:

```ts
/**
 * How long the list may be trusted without re-reading it.
 *
 * The stamp does the real work — it catches an addition on the next mount or
 * focus. This is the backstop for the one thing it cannot see: a **removal**
 * does not move `updated` (`docs.NewestCatalogs.frontend.md` §4), so a banned
 * shop could sit on screen indefinitely on the stamp alone.
 *
 * Same remedy, and the same reasoning, as `LOCATION_STALE_MS` in
 * `useCatalogLocation` — which carries a time bound precisely because a
 * location edit does not move the catalog's stamp either. An hour is generous
 * because the list changes a few times a day at most, and a shorter value buys
 * nothing but requests.
 *
 * Unlike that one, this query **is** persisted, so the window survives a
 * reload on its own: React Query dehydrates `dataUpdatedAt` with the row.
 * Do not hand-roll a `fetchedAt` field.
 */
const NEWEST_MAX_AGE_MS = 60 * 60 * 1000
```

**Do not try to detect removals properly.** There is no endpoint for it and none is planned; the
API deliberately will not fabricate a stamp movement for a deletion, because a stamp two different
causes can write is a stamp that starts disagreeing with its list. The time bound is the agreed
answer on both sides.

### 5.4 The hook

```ts
// src/sections/home/hooks/useNewestCatalogs.ts

/** Matches the server's `Cache-Control: max-age=30`. Anything shorter cannot
 *  learn anything — the browser answers it from the HTTP cache. */
const STAMP_STALE_MS = 30_000

export function useNewestCatalogsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.newestCatalogs(),
    queryFn: fetchNewestCatalogs,
    enabled,
    staleTime: NEWEST_MAX_AGE_MS,
    // Overrides the app default so the bound above can actually expire; without
    // it the entry would sit in memory unread for the life of the session.
    refetchOnMount: true,
    retry: 0,
  })
}

/**
 * Decides whether the cached showcase is still the showcase.
 *
 * **On mount and on window focus, never on an interval.** A backgrounded tab
 * polling a list nobody is reading is the waste this feature removes. A
 * live-updating "new shops" ticker is a product decision with a cost, not a
 * default.
 */
export function useNewestCatalogs(enabled = true) {
  const queryClient = useQueryClient()
  const list = useNewestCatalogsQuery(enabled)

  const { data: stamp } = useQuery({
    queryKey: queryKeys.newestStamp(),
    queryFn: fetchNewestUpdated,
    enabled,
    staleTime: STAMP_STALE_MS,
    // Both override the app defaults and both are load-bearing: with
    // `refetchOnMount: false` the entry would still be in memory from the last
    // visit and nothing would ever ask the server again.
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    // A failed freshness check is not evidence anything changed, so there is
    // nothing to retry towards: keep serving what we have.
    retry: 0,
  })

  const live = stamp?.updated
  // The baseline is a field of the payload, not a second cache entry — §5.5.
  const held = list.data?.updated

  useEffect(() => {
    if (!live || !held) return
    // Compared for *inequality*, never ordering. The stamp is the server's wall
    // clock; `>` would pin us to stale data forever if it ever stepped
    // backward, where `!==` self-heals on the next write.
    if (live === held) return

    // One refetch per distinct stamp value. The two endpoints are computed
    // independently, so if they ever disagree permanently — a row the list
    // filters out but the stamp was taken from — an unguarded gate would
    // refetch on every mount and focus forever. This entry (not a `useRef`,
    // which dies with the mount, and Home remounts on every visit to "/")
    // holds the live value already acted on.
    if (queryClient.getQueryData<string>(queryKeys.newestChecked()) === live) return
    queryClient.setQueryData(queryKeys.newestChecked(), live)

    // `exact`, because the stamp and the guard are nested under the same root
    // for readability and a prefix match would refetch the stamp too.
    void queryClient.refetchQueries({ queryKey: queryKeys.newestCatalogs(), exact: true })
  }, [live, held, queryClient])

  return list
}
```

`enabled` is `opened.comprar`: a user who never opens the buy tab spends neither request, and the
restored blob is simply never read.

### 5.5 Two deliberate differences from the catalog version

**1. No id.** The keys take no argument — one global list, not one per shop. Nothing about the
showcase is per-viewer, which is also why it needs no auth.

**2. There is no `newestSynced` key, and that is not an omission.** The catalog pattern needs a
separate "which stamp does the cached copy match?" entry because `GET /catalog/:id` does not return
a stamp, so the baseline has to be inferred and stored beside the payload — and persisted with it,
or a restored copy cannot be checked at all.

`GET /newest` **carries its own stamp in the payload**. The baseline is therefore a field of the
row we already hold: durable because the payload is persisted, atomic because it is the same
object, and incapable of drifting out of step because there is nothing to keep in step. The
handover's §3 prescribes `newestSynced` and then tells us to write the payload's own `updated` into
it — which is a copy of data in hand, in a second entry that has to be persisted in lockstep. We
keep the *rule* (the baseline must be durable and travel with the payload) and drop the mechanism
that the catalog's weaker contract forced on it. The keys are entirely client-side, so this costs
the backend nothing.

What `newestChecked` holds is a different fact — the live stamp the gate has already acted on — and
it exists for the loop case in §5.4, not as a baseline.

### 5.6 A failed read is never an error state

The rules, in order of how likely they are to be got wrong:

- **A failed stamp read changes nothing.** Keep rendering the rows in hand. This is the same shape
  as the map's 429 rule: a failed check is not evidence anything changed.
- **A failed list refetch keeps the previous rows.** React Query reports `isError` while still
  holding `data`; the section adapter (§6.1) reads `data` first, so the error block only ever
  appears when there is nothing to show.
- **Rate limits are asymmetric on purpose** (contract §6): `/newest/updated` is exempt, `/newest`
  is counted by the global 600 / 15 min backstop shared with everything else. The cheap question is
  free, the expensive answer is not — which is the whole reason the gate exists.

---

## 6. Rendering

### 6.1 The section adapter

`ComprarPanel` already takes `{ status, data, reload }` for `savedCatalogs`. Keep that shape so the
panel stays homogeneous — `HomePage` builds it from the query exactly as it already does for
`myCatalog`:

```ts
const newest = useNewestCatalogs(opened.comprar)

const newestSection = useMemo(() => {
  const data = newest.data?.catalogs ?? null
  // An unopened tab is `idle`, not `loading` — it has not been asked for.
  const status: SectionStatus = !opened.comprar
    ? 'idle'
    // Data first: a failed *refetch* over rows we still hold is not an error
    // the user needs to see.
    : data
      ? 'ready'
      : newest.isError
        ? 'error'
        : 'loading'
  return { status, data, reload: () => void newest.refetch() }
}, [opened.comprar, newest])
```

### 6.2 Assume a blank, pictureless shop

A shop enters the showcase the moment its owner verifies a phone — **before** they have necessarily
named it or photographed it. Contract §5 records this as a deliberate product decision, so the
showcase has to look finished with nothing filled in. Both fallbacks already exist and neither is
new work:

| Field | When absent | Use |
|---|---|---|
| `alias === ''` | seller has not named the shop | `publicCatalogName(alias)` from `@/lib/catalogName` → *"Catálogo en Alkachof"*. The **public** voice — `ownerCatalogName` would say "Mi". |
| `image` absent | seller has not uploaded one | `CatalogThumb` with no `src`: it already draws `CATALOG_PLACEHOLDER_SRC` on `PLACEHOLDER_BG`, with `object-contain`, `loading="lazy"` and `decoding="async"`. |

- **Never write a fallback name back.** `catalogName.ts` explains why: a default persisted into the
  row becomes indistinguishable from a seller who chose it, and no migration can separate them
  afterwards. These are render-time substitutions only.
- **Every `image` goes through `resolveMediaUrl`** from `@/lib/mediaUrl`. The API persists
  *absolute* urls, and a row written while the backend ran without `PUBLIC_URL` holds a `localhost`
  origin that resolves only on the server's own machine. The rewrite is an identity when the API
  base is itself localhost, so it is safe in every stage.
- `placeholders.ts` already notes that "a list of 25 unfilled boxes shows the item one 25 times" —
  **this is that list.** `PLACEHOLDER_BG` behind the artwork is what keeps the letterboxing
  invisible.

### 6.3 The rows

`NewestCatalogList` is `SavedCatalogList` minus the two fields the row does not carry, plus the age
line. Same `<Link>` card (`rounded-2xl border-2 border-ink bg-card p-4`), same `CatalogThumb` at
`sm`, same `ChevronRight`, same `aria-label` sentence.

```tsx
<Link to={`/catalog/${row.catalogId}`} aria-label={`Ver catálogo ${publicCatalogName(row.alias)}`}>
  <CatalogThumb src={resolveMediaUrl(row.image)} />
  <span className="truncate text-base font-semibold">{publicCatalogName(row.alias)}</span>
  <span className="text-xs text-muted-foreground">{formatRelative(row.createdOn)}</span>
  <ChevronRight … />
</Link>
```

- **`/catalog/:catalogId`, never `/join?catalogId=…`.** That one is for a cold arrival scanning a
  printed QR; someone already inside the app is not that. This is the same route every in-app deep
  link uses (`navigationUrlService.catalogUrl` on the server).
- **`formatRelative` from `@/lib/format`**, which already exists and already answers in Spanish
  ("hace 3 d", falling back to a date past a week). Rendered bare, with no prefix: under a heading
  that says *Catálogos nuevos* the relative time needs no verb, and every candidate prefix reads
  badly against the date fallback ("Se abrió 14 de julio").
- **All 25 rows, no client-side cap.** The cap is the server's and it is the whole response; a
  shorter list here would need a "ver todos" with nowhere to go, since there is no route and no
  pagination (contract §7). A vertical list over a horizontal rail: 25 cards in a scroller on a
  phone hides most of them behind a gesture, and the rail would be the only one of its kind in the
  app.
- **The thumbnails are full-size catalog images** (the `catalogs` preset is 1600px) shown at 44px —
  the same trade the map pins already make. `loading="lazy"` inside `CatalogThumb` keeps the
  off-screen ones off the wire. A thumbnail variant from the API is the real fix if a full
  showcase ever gets expensive; it is not a reason to delay this.

### 6.4 The empty state

`{ catalogs: [], updated: "1970-01-01T00:00:00.000Z" }` is a **valid answer**, not a failure. It is
what a brand-new environment returns, what a deployment returns before the backend's backfill script
has run (contract §8), and what production would return if every listed seller were deactivated at
once. Build it as a dashed box in the shape `SavedCatalogList` already uses for "no subscriptions".

---

## 7. Copy (es-MX, exact)

| Where | String |
|---|---|
| Section heading | `Catálogos nuevos` |
| Heading caption | `Las tiendas más recientes en Alkachof` |
| Loading label (`SectionSkeleton`) | `Cargando catálogos nuevos` |
| Error (`SectionError`) | `No pudimos cargar los catálogos nuevos.` |
| Empty state | `Todavía no hay catálogos nuevos. Cuando alguien abra su tienda, va a aparecer aquí.` |
| Row link label | `Ver catálogo {nombre}` |
| Unnamed shop | `Catálogo en Alkachof` (from `PUBLIC_CATALOG_NAME`) |

*Novedades* is not used: that word is already the news feed's territory on the other tab. Nothing
here says "cerca de ti" or implies proximity — this is newest anywhere, and nearby shops are the
map's job.

---

## 8. Tests

### `src/sections/home/__tests__/HomePage.test.tsx` — added cases

`vi.mock('../actions/fetchNewestCatalogs')` beside the existing action mocks.

1. Opening Comprar renders the heading and one row per catalog, linking to `/catalog/:id`.
2. A row with `alias: ''` renders *"Catálogo en Alkachof"*, and a row with no `image` renders the
   placeholder — the two normal-case fallbacks of §6.2.
3. An empty `catalogs` array renders the empty state, not the error block.
4. **Neither read fires while the user is on Mis cosas.** The `enabled` gate, pinned.
5. A rejected `fetchNewestCatalogs` renders the error block with a working `Reintentar`, and does
   not blank the rest of the panel.

### `src/sections/home/__tests__/NewestCatalogsFreshness.test.tsx` — new suite

Modelled on `src/sections/publicCatalog/__tests__/CatalogFreshness.test.tsx`, including its device
for reaching the interesting case without a fake clock: `invalidateQueries({ queryKey: ['newest',
'stamp'] })` stands in for the 30-second window elapsing. One client across renders, so a
"revisit" sees what the first visit cached. Every assertion is on **how many times an action ran**.

1. First open fetches the list once and the stamp once, and does **not** refetch the list — the
   payload's own `updated` is its baseline (§5.5).
2. A revisit inside the stamp window costs nothing at all, not even the stamp.
3. Window elapsed, stamp unchanged → the stamp is re-read, the list is not.
4. Window elapsed, stamp changed → the list is refetched **exactly once**.
5. Window elapsed, stamp changed, and the refetched list comes back with a *still-different*
   `updated` (the permanent-disagreement case) → the list is refetched once and then no more, even
   across an unmount and remount. This is the `newestChecked` guard; without it this test loops.
6. A rejected stamp read keeps the cached rows on screen and triggers no list refetch.

### `src/lib/__tests__/queryPersist.test.tsx` — added cases

Beside the existing "never persists the live freshness stamp":

7. `['newest','list']` is written to disk.
8. `['newest','stamp']` and `['newest','checked']` are not.

---

## 9. Order of work

1. `actions/fetchNewestCatalogs.ts` — both reads, both types.
2. `queryKeys.ts` — the three keys and the block comment.
3. `queryPersist.tsx` — `newestCatalogs()` into `PERSISTED_KEYS`, and the note on the two held
   back. Tests 7–8 here.
4. `hooks/useNewestCatalogs.ts` — the queries and the gate. Suite §8.2 here; it is the part with
   the real rules in it.
5. `components/NewestCatalogList.tsx` — rows, fallbacks, empty state.
6. `ComprarPanel.tsx` + `HomePage.tsx` — the section and the adapter. Cases §8.1 here.
7. `CLAUDE.md` (§11).

Steps 1–4 are the feature; 5–6 are a list. Verify against a real API on the test ids in
`CLAUDE.md`, and expect an **empty** showcase on any environment where the backfill has not run
(contract §8) — that is not a client bug.

---

## 10. Out of scope

- **No route and no page.** No `/newest`, no "ver todos". If a full explore page is wanted, that is
  when §2's promotion to its own section happens.
- **No pagination, filtering or sorting.** 25 rows by recency is the entire API.
- **No per-row follow-up fetch.** §4.
- **No proximity.** Nearby shops are `GET /location/lookup` (`followup.LocationSearchApi.md`), a
  separate feature behind its own flag. Nothing on this block mentions distance.
- **No socket push.** A new shop is not an event anyone waits on; the stamp is the channel. Do not
  add this to `liveEvents.ts`.
- **No owner opt-out.** A seller cannot remove their shop from the showcase, and this client must
  not imply they can. If product wants it, it is a new flag with its own endpoint and
  `DiscoverabilityToggle` is the pattern — note the showcase is **not** gated on
  `is_discoverable`, which is the map's flag and the map's only.
- **No write side.** `POST /newest` is a 404 and the API's route tests keep it that way.
- **Not on `AboutPage`.** A public showcase on the public pitch page is tempting and would break
  the build: anything prerendered must render with no session, no browser and **no API**
  (`CLAUDE.md` §Findability). Putting it there is a separate decision with a prerender story of its
  own.
- **No interval poll.** §5.4.

---

## 11. `CLAUDE.md` edits on ship

1. **Caching → a new subsection**, *"The newest-catalogs showcase"*, after *"Public catalog
   freshness"*: the keys, the stamp gate, the hour bound and why (§5.3), the no-`newestSynced`
   decision (§5.5), the loop guard, and that it is persisted while the stamp and the guard are not.
2. **Caching → `PERSISTED_KEYS` paragraph**: name the list as the second gated payload allowed on
   disk, and the two keys held back.
3. **The sections list**: one line under the news-feed block noting that the showcase is a Home
   block in `sections/home/`, with no page and no route, and the reason (§2).
4. **Component locations table**: `NewestCatalogList`.
5. **`feature.NewestCatalogs.md`** — done: the follow-up-call sentence was corrected in place
   (§4). A record asserting the client must fetch each catalog separately was the one line in this
   corpus most likely to produce 25 needless requests a year from now.
