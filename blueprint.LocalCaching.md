# Blueprint — Local Caching (web client)

Implementation plan for `epic.LocalCahing.md`. Grounded in the current code:
`src/sections/auth/AuthContext.tsx`, `src/sections/catalog/context/EditCatalogContext.tsx`,
`src/sections/home/HomePage.tsx`, `src/sections/catalog/hooks/useInstagram*.ts`.

---

## 0. Reality check — where the calls actually come from

The epic asks to cut redundant reads. Before choosing a tool, here is what the code
does today. Every one of these is a **client-side** repeat: the same resource, the
same session, no user action that could have changed it.

| # | What re-fetches | Trigger | Why |
|---|---|---|---|
| 1 | `GET /catalog` + `GET /catalog/:id/items` | every mount of `/catalog` | `EditCatalogProvider`'s `useEffect` has `[]` deps, but the provider is *inside* the route element — leaving the tab unmounts it (`CatalogPage.tsx:36`, `EditCatalogContext.tsx:41`) |
| 2 | `GET /catalog` + `GET /catalog/:id/items` **again** | every mount of `/` | `HomePage` loads the same two resources for the "Mi catálogo" tile through `useAsyncSection` (`HomePage.tsx:32-36`) — it has no idea the catalog editor already read them |
| 3 | `GET /instagram/status` | every mount of `/catalog` | `useInstagramAvailability` in `ProductGrid` (`ProductGrid.tsx:29`) |
| 4 | `GET /instagram/status` **again** | every open of the import dialog | `useInstagramImport.checkEnrollment` (`useInstagramImport.ts:206`) calls the action directly — it cannot see the read `ProductGrid` just did |
| 5 | `GET /profile` | every app boot / hard reload | `AuthProvider` (`AuthContext.tsx:19`). Correct *within* a session — the context holds it — but nothing survives a reload or a PWA cold start |

**A realistic session, counted from the code.** Authenticated, cold start on `/`
(Mis cosas) → `/catalog` → open the Instagram dialog → back to `/` → `/profile` →
back to `/catalog`:

```
GET /profile                1   (boot)
GET /catalog                4   (Home, Catalog, Home, Catalog)
GET /catalog/:id/items      4   (same four)
GET /instagram/status       3   (Catalog, dialog, Catalog)
                           ──
                           12  requests for 4 distinct resources
```

Under `StrictMode` (`main.tsx:7`, dev only) each of those effects runs twice, so a
developer watching the network tab sees 24.

Two further facts that shape the design:

- **The owner is the only writer.** `/catalog`, its items and `/profile` are
  single-owner rows edited through this client. Cross-device staleness is the only
  real risk, and it is not what these 12 calls are paying for.
- **The mutations already return the new row.** `updateCatalog`, `updateItem`,
  `createItem`, `uploadCatalogImage`, `updateProfile` all resolve to the updated
  object, and the existing code already writes it into local state. The epic's
  "after any CRUD operation, store it on a cache" is therefore a *relocation* of
  state that already exists, not new bookkeeping.

**In-scope target: 12 → 4** on that session (−67%), and **4 → 1** on a warm reload
once persistence lands.

> These are counts derived from the code paths, not from the production metrics the
> epic refers to. Confirm the ratio against the real measurements before quoting it.

---

## 1. Scope at a glance

| # | Change | Files |
|---|---|---|
| 1 | Add `@tanstack/react-query` + devtools | `package.json` |
| 2 | One `QueryClient`, one key registry, one policy table | new `src/lib/queryClient.ts`, `src/lib/queryKeys.ts` |
| 3 | Mount the provider above `AuthProvider`; clear the cache on logout | `src/router/AppRouter.tsx`, `src/sections/auth/AuthContext.tsx` |
| 4 | **Opportunity 4** — profile behind a query, seeded by its mutations | `src/sections/auth/AuthContext.tsx`, `src/sections/profile/components/EditProfileScreen.tsx` |
| 5 | **Opportunities 2 + 3** — shared owner-catalog + items queries | new `src/sections/catalogs/hooks/`, `src/sections/catalog/context/EditCatalogContext.tsx`, `src/sections/home/HomePage.tsx` |
| 6 | **Opportunity 1** — Instagram status behind one cooldown-aware query | `src/sections/catalog/hooks/useInstagramAvailability.ts`, `useInstagramImport.ts` |
| 7 | Persist the cache to `localStorage`, scoped and busted | new `src/lib/queryPersist.ts` |
| 8 | Test harness: a provider wrapper with a fresh client per test | new `src/test/renderWithProviders.tsx`, 6 existing test files |
| 9 | Document the rule so new actions do not reintroduce the problem | `CLAUDE.md` |

**Out of scope** (say so out loud, they are the tempting next step):

- The **public** catalog (`/catalog/:catalogId`), questions, notifications, chat,
  and the Pedidos feed. Different staleness contract — other people write those
  rows, and Pedidos already has hand-rolled pagination that accumulates pages
  (`useOrdersFeed`). Converting it is a separate blueprint.
- The cart. It is already client-side and persisted (`alkachof.cart`); a query
  cache adds nothing.
- HTTP-level caching (`ETag` / `Cache-Control`). That is an API-side change and
  the epic asks for a client one.
- Optimistic mutations with rollback beyond what already exists. `updateCatalog`
  already does snapshot-and-restore (`EditCatalogContext.tsx:66-77`); keep it,
  do not generalise it.

---

## 2. Decisions taken

| Decision | Taken as | Why |
|---|---|---|
| Library | `@tanstack/react-query` v5 | The epic names it. v5 supports React 19, and `staleTime` as a function (v5.50+) is exactly what the Instagram cooldown needs. |
| Where queries live | Shared ones in `src/sections/catalogs/hooks/`, section-private ones under their own section | `catalogs/` already exists as the shared owner-catalog module (`actions/fetchMyCatalog.ts`), and both Home and the editor import from it today. No new top-level concept. |
| Existing contexts | **Kept**, internals swapped | `useEditCatalog()` has six consumers and `useAuth()` has more. Changing what they *return* would ripple through every component and test for no benefit. The providers become thin adapters over queries. |
| Existing hook shapes | `useInstagramAvailability` and `useAsyncSection`'s consumers keep their exact return shape | `ProductGrid` and `MisCosasPanel` are untouched, so their tests are untouched. |
| Refetch triggers | `refetchOnWindowFocus: false`, `refetchOnReconnect: false`, `refetchOnMount: false` globally | The defaults are all `true`. On a phone, tab-switching and network flapping are constant — leaving them on would *add* calls, which is the opposite of the epic. |
| Freshness | `staleTime: Infinity` for owner-owned rows; the cooldown date for `/instagram/status` | These rows change only through mutations this client performs, and those mutations write the response into the cache. A timer-based refetch would be spending calls to learn something we already know. |
| Invalidation | Only where a **server-side** write happened that we do not hold the result of | Exactly one case today: the Instagram import creates items the 201 does not fully describe (`reloadItems`, see `InstagramImport.test.tsx:407`). Everything else is `setQueryData`. |
| Retries | `retry: 1` globally, `retry: 0` for `/instagram/status` | v5 defaults to 3 — a down endpoint becomes 4 requests. Status fails open anyway, so a retry buys nothing. |
| Persistence scope | **Phase 3**, profile + Instagram status only by default | Those two are the epic's explicit ask and the two where a stale read is harmless. Catalog items persist behind a boot-revalidate (§7.2) because a deleted product rendering from disk is a real defect. |
| Dev stage | Untouched | Queries call the same action functions, which already branch on `IS_DEV_STAGE`. No new endpoints, therefore **no new mock files** (CLAUDE.md rule 1 is satisfied by the existing mocks). |

---

## 3. The cache contract

One table. If a new query is not in it, it does not exist.

`src/lib/queryKeys.ts`:

```ts
/**
 * Every cache key in the app. Keys are hierarchical so a prefix can invalidate a
 * subtree, and they are built here so no two call sites can disagree on one.
 */
export const queryKeys = {
  profile: () => ['profile'] as const,
  myCatalog: () => ['catalog', 'mine'] as const,
  catalogItems: (catalogId: string) => ['catalog', catalogId, 'items'] as const,
  instagramStatus: () => ['instagram', 'status'] as const,
}
```

| Key | Endpoint | `staleTime` | Written by | Invalidated by |
|---|---|---|---|---|
| `['profile']` | `GET /profile` | `Infinity` | `updateProfile`, `uploadProfileImage` → `setQueryData` | logout (`clear()`) |
| `['catalog','mine']` | `GET /catalog` | `Infinity` | `updateCatalog`, `uploadCatalogImage`, `deleteCatalogImage` → `setQueryData` | logout |
| `['catalog',id,'items']` | `GET /catalog/:id/items` | `Infinity` | `createItem`, `updateItem`, `deleteItem` → `setQueryData` | **Instagram import only** |
| `['instagram','status']` | `GET /instagram/status` | until `nextAvailable` (§6.1) | `enrollInstagram`, `importInstagramPosts` 201, any 429 → `setQueryData` | logout |

**The rule this encodes, and the one to put in `CLAUDE.md`:** a mutation that
returns the updated row **writes it into the cache**. It never invalidates. An
invalidation is an admission that the server changed something we cannot
reconstruct — today that is one code path, and it should stay countable.

---

## 4. Phase 1 — the foundation

### 4.1 Dependency

```bash
npm i @tanstack/react-query
npm i -D @tanstack/react-query-devtools
```

### 4.2 `src/lib/queryClient.ts` (new)

```ts
import { QueryClient } from '@tanstack/react-query'

/**
 * The app's cache policy, in one place.
 *
 * Every default here is the opposite of the library's, deliberately. React Query
 * ships tuned for dashboards on a desk — refetch on focus, on reconnect, on
 * mount, retry three times. Alkachof runs on a phone on mobile data, and the rows
 * it caches (a seller's own catalog, their own profile) change only through
 * mutations this client performs. Those mutations write their response into the
 * cache, so a timer- or focus-driven refetch would spend a request to learn
 * something we already hold.
 *
 * Anything owned by *someone else* — the public catalog, questions, orders — is
 * not cached here, and must not inherit these defaults without its own reason.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Infinity,
        gcTime: 24 * 60 * 60 * 1000, // survives a long session; persistence extends it
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        retry: 1,
      },
      mutations: { retry: 0 },
    },
  })
}
```

`gcTime` matters more than usual: with `refetchOnMount: false`, a query whose last
observer unmounted and whose entry was then garbage-collected refetches on the next
mount. `gcTime` shorter than a session would silently undo opportunities 2 and 3.

### 4.3 Mount it — `src/router/AppRouter.tsx`

The provider goes **inside `ErrorBoundary`, outside `AuthProvider`** — `AuthProvider`
needs `useQueryClient()` both to read the profile and to clear the cache on logout.

```tsx
const queryClient = createQueryClient()   // module scope: one per app, not per render

<ErrorBoundary>
  <ToastProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        …
      </AuthProvider>
    </QueryClientProvider>
  </ToastProvider>
</ErrorBoundary>
```

### 4.4 Logout must clear the cache — security, not performance

`clearTokens()` today leaves nothing behind because every cache is React state that
dies with the tree. A `QueryClient` at module scope does not die, and once §7 lands
the cache is on disk. Two users on one phone is an ordinary case for this product.

In `AuthContext.tsx`:

```ts
const logout = useCallback(() => {
  clearTokens()
  queryClient.clear()          // in-memory
  void clearPersistedCache()   // localStorage — added in §7
}, [queryClient])
```

Also clear it on the 401 path in `api.ts` that already calls `clearTokens()`. That
is a module-level function with no access to the client — export a
`registerCacheReset(fn)` from `queryClient.ts` and have `AppRouter` register it, or
handle it in `AuthProvider` by keying off the query error. **Pick one and only one;
two half-wired paths here is how stale rows leak.**

---

## 5. Opportunity 4 — the user profile

### 5.1 `AuthProvider` reads through a query

`AuthState` is unchanged — `profile`, `isAuthenticated`, `isBooting`, `login`,
`signup`, `logout`, `updateProfile`. Only the source moves.

```ts
const hasToken = Boolean(getToken())

const { data: profile, isLoading, isError } = useQuery({
  queryKey: queryKeys.profile(),
  queryFn: fetchProfile,
  enabled: hasToken,
})

// Preserved from the current effect: a profile read that fails means the token is
// no good, and the session is dropped rather than left half-authenticated.
useEffect(() => { if (isError) clearTokens() }, [isError])

const isBooting = hasToken && isLoading
```

Two details that are easy to get wrong:

- **`getToken()` is read from `localStorage` during render.** `enabled` must flip
  to `true` after `login()` writes the tokens. `login` already `await`s
  `fetchProfile()` — change it to `queryClient.fetchQuery({ queryKey, queryFn })`,
  which both seeds the cache and forces the re-render. Do **not** leave the
  `enabled` flag as the only trigger.
- `useQuery` returns `undefined`, not `null`, when there is no data.
  `AuthState.profile` is typed `Profile | null`; coerce with `?? null` so nothing
  downstream changes.

### 5.2 Mutations seed the cache

`updateProfile(patch)` in the context becomes:

```ts
const updateProfile = useCallback((patch: Partial<Profile>) => {
  queryClient.setQueryData<Profile>(queryKeys.profile(), (prev) =>
    prev ? { ...prev, ...patch } : prev,
  )
}, [queryClient])
```

Its two callers are unchanged: `EditProfileScreen` already passes the full updated
profile from `updateProfileAction`'s response (`ProfilePage.tsx:83`), and the image
field passes `{ profile_picture_url }` (`ProfilePage.tsx:52`). **This is the whole
of opportunity 4** — the write path already existed, it just needs to land somewhere
that outlives the tree.

**Win:** zero within a session (the context already achieved that); **one call per
warm reload** once §7 lands. Small, but it is on the critical boot path — the app
currently shows `isBooting` until `/profile` answers, so this is also a
time-to-first-paint fix.

---

## 6. Opportunities 2 + 3 — catalog metadata and items

### 6.1 Two shared hooks

New `src/sections/catalogs/hooks/useMyCatalog.ts` and `useCatalogItems.ts`:

```ts
/**
 * The authenticated owner's catalog. Shared by the Home tile and the catalog
 * editor, which is the point: they used to read it separately and neither could
 * see the other's copy.
 */
export function useMyCatalog() {
  return useQuery({ queryKey: queryKeys.myCatalog(), queryFn: fetchMyCatalog })
}

/** Depends on the catalog id, so it stays disabled until the catalog resolves. */
export function useCatalogItems(catalogId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.catalogItems(catalogId ?? ''),
    queryFn: () => fetchCatalogItems(catalogId!),
    enabled: Boolean(catalogId),
  })
}
```

The dependent-query shape replaces the sequential `then` chain in
`EditCatalogContext.tsx:47-52` and in `HomePage.tsx:32-36`, and is what makes them
share: both end up on the same two keys.

### 6.2 `EditCatalogProvider` becomes an adapter

The exported `EditCatalogState` is unchanged. Internals:

```ts
const catalogQuery = useMyCatalog()
const itemsQuery   = useCatalogItems(catalogQuery.data?._id)

const catalog   = catalogQuery.data ?? null
const items     = itemsQuery.data ?? []
const isLoading = catalogQuery.isLoading || itemsQuery.isLoading
const error     = (catalogQuery.error ?? itemsQuery.error)?.message ?? null
```

Each mutation keeps its current signature and error behaviour, and writes the
response into the cache instead of `setState`:

| Method | Cache write |
|---|---|
| `updateCatalog(patch)` | optimistic `setQueryData(myCatalog, {...prev, ...patch})`, restore the snapshot in `catch`, write the response on success — **identical semantics to today's code**, one line different |
| `uploadCatalogImage` / `deleteCatalogImage` | `setQueryData(myCatalog, updated)` |
| `createItem` | `setQueryData(catalogItems(id), (prev) => [...prev, created])` |
| `updateItem` | `setQueryData(catalogItems(id), (prev) => prev.map(…))` |
| `deleteItem` | `setQueryData(catalogItems(id), (prev) => prev.filter(…))` |
| `reloadItems` | `invalidateQueries({ queryKey: catalogItems(id) })` — the one legitimate refetch |

`isLoading` has one behavioural change worth naming: the second visit to `/catalog`
resolves from cache, so `CatalogContent`'s "Cargando catálogo…" spinner
(`CatalogPage.tsx:12`) never appears. That is the feature, and it is what the
existing loading test asserts against a pending promise — see §8.

### 6.3 `HomePage` joins the same keys

`MisCosasPanel` takes `{ status, data, reload }` (`useAsyncSection`'s shape). Keep
that contract and adapt, rather than rewriting the panel:

```ts
/** Maps a query onto the shape the Home panels already consume. */
function toSection<T>(q: UseQueryResult<T>, data: T | null) {
  return {
    status: q.isLoading ? 'loading' : q.isError ? 'error' : q.data ? 'ready' : 'idle',
    data,
    reload: () => q.refetch().then(() => {}),
  }
}
```

Home needs `{ catalog, itemCount }`; build it from the two shared queries and gate
both on the tab flag Home already computes (`enabled: opened['mis-cosas']`) so
deep-linking to Comprar still fetches nothing — `HomePage.test.tsx:291` asserts
this and must keep passing.

`fetchNews` and `fetchSavedCatalogs` **stay on `useAsyncSection`**. They are not in
the epic, and leaving them alone keeps this diff readable.

**Win:** items 1 and 2 of §0 — 8 requests down to 2 on the sample session.

---

## 7. Opportunity 1 — the Instagram lock

The most valuable one per call, because `/status` guards a **billed** scraper run,
and the one with the most rules attached (see `CLAUDE.md` → *The cooldown*).

### 7.1 One query, cooldown-aware freshness

```ts
export function useInstagramStatusQuery() {
  return useQuery({
    queryKey: queryKeys.instagramStatus(),
    queryFn: fetchInstagramStatus,
    retry: 0,                     // fails open; a retry buys nothing
    staleTime: (query) => {
      const next = query.state.data?.nextAvailable
      if (!next) return 5 * 60 * 1000        // not gated: a short floor is enough
      const remaining = Date.parse(next) - Date.now()
      // Fresh until the server's own date passes, then stale so the next mount
      // re-reads once and learns the gate has lifted.
      return Number.isFinite(remaining) && remaining > 0 ? remaining : 0
    },
  })
}
```

**This does not violate "never compute the date locally".** The client's clock
decides *when to re-read an unmetered endpoint*, never whether the seller may
import. The date shown on screen is still the server's string, and the gate is
still the API's 429 on `/posts` and `/convert`. A skewed clock costs one extra
`/status` read, or one refused metered call the UI already handles as terminal —
the same failure mode the current code has.

### 7.2 `useInstagramAvailability` — same shape, no fetch of its own

Its public type (`available`, `nextAvailable`, `cooldownDays`, `refresh`) is
unchanged, so `ProductGrid` is untouched. The body becomes a read of the query plus
the two mappings it already performs:

- an un-enrolled seller is `available: true` (the wizard is their gate);
- **fails open** — `isError` or `data === undefined` must yield `available: true`.
  With `useQuery` that is the *default* state, so this is now structural rather
  than a `.catch(() => {})`;
- `refresh()` → `refetch()`.

### 7.3 `useInstagramImport.checkEnrollment` stops double-reading

Replace the direct `fetchInstagramStatus()` call with

```ts
const status = await queryClient.ensureQueryData({ queryKey: queryKeys.instagramStatus(), … })
```

`ensureQueryData` returns the cached value when fresh and fetches when not — so
opening the dialog straight after `ProductGrid` mounted costs **zero** requests,
and the phase machine (`checking → cooldown | browsing | searching`) is unchanged.
Keep the `try/catch` → `phase: 'searching'` fallback exactly as it is.

### 7.4 Every server answer about the cooldown writes the cache

This is the epic's "save the available date" and it is the part that makes the
lock survive a navigation:

| Event | Write |
|---|---|
| `enrollInstagram` → `{ ok: true }` | `setQueryData(instagramStatus, { ...prev, enrolled: true })` |
| `enrollInstagram` → `alreadyEnrolled` (409) | same — the API just told us the truth |
| `importInstagramPosts` 201 with `nextAvailable` | `setQueryData(… { available: false, nextAvailable })` |
| `importInstagramPosts` 201 with `nextAvailable: null` | leave it — nothing landed, no cooldown started (`CLAUDE.md`: *only a successful import starts it*) |
| any 429 from `/posts` or `/convert` (`availableAtOf`) | `setQueryData(… { available: false, nextAvailable: availableAt })` |

`ProductGrid.handleImported` currently calls `refreshInstagram()` after an import
(`ProductGrid.tsx:47`) — that becomes **unnecessary and should be deleted**: the
import already knows the new date and wrote it. One fewer request on the exact
screen the epic is about. Keep `reloadItems()`; the created items are the one thing
we genuinely do not hold.

Non-negotiable, restated so this phase cannot erode them:

- **`fetchInstagramPosts` is never cached.** It is the billed call. Opening the
  dialog is the only thing that reads the feed, and that stays true. Caching it
  would make a stale feed importable.
- No refetch, poll or window-focus revalidation on any `/instagram/*` key. The
  global defaults already forbid it; do not override them here.

**Win:** items 3 and 4 of §0, plus the post-import refresh — 4 requests down to 1
on the sample session, and 0 on a warm reload once §8 lands.

---

## 8. Phase 3 — persistence across reloads

> **Superseded.** This section was the sketch; the decisions it implies turned out to
> need their own document. **Read `blueprint.CachePersistence.md` instead** — it
> revises three things in here: the allowlist splits into *persist-and-revalidate*
> vs *persist-and-trust* (they buy different prizes), the `buster` is derived from
> the build rather than hand-maintained, and persistence must be **off** in dev stage
> because it contradicts `mockInstagramStore`. What follows is kept for context.

In-memory caching solves navigation. It does **not** solve a reload, a PWA cold
start, or a phone killing the tab — and that is where opportunity 1's "save the
available date to a cookie" was pointing.

```bash
npm i @tanstack/query-sync-storage-persister @tanstack/react-query-persist-client
```

`src/lib/queryPersist.ts` (new):

```ts
const STORAGE_KEY = 'alkachof.query'

/**
 * `buster` invalidates every persisted entry when the shape of what we cache
 * changes. Bump it whenever a cached type gains or loses a field — a dehydrated
 * row from an older build rehydrates as the *new* type without validation.
 */
const CACHE_VERSION = 'v1'
```

Wire `PersistQueryClientProvider` in place of `QueryClientProvider`, with:

- `maxAge: 24h`;
- `buster: CACHE_VERSION`;
- **`dehydrateOptions.shouldDehydrateQuery`: an allowlist**, never "everything that
  succeeded". Default allowlist: `['profile']` and `['instagram','status']`.

### 8.1 Why the allowlist is short

| Key | Persist? | Reasoning |
|---|---|---|
| `['profile']` | **yes** | Changes only through this client's own mutation. Worst case on another device: a stale alias until the next write. Removes a call from the boot critical path. |
| `['instagram','status']` | **yes** | The epic's opportunity 1 verbatim. Its own `staleTime` already expires it at `nextAvailable`, and it fails open — a stale `available: true` just meets the API's 429 one screen later, which is the documented behaviour. |
| `['catalog','mine']` | behind §8.2 | Persisting it alone is nearly safe, but it is only useful together with items. |
| `['catalog',id,'items']` | behind §8.2 | **A deleted product rendering from disk is a real defect** — the seller's catalog is what buyers see, and "I deleted that" is the complaint this would generate. |

### 8.2 If catalog + items are persisted, they must revalidate once per cold start

Optional, and only with this rule attached: persisted catalog data paints
immediately (good — the editor currently blocks on a spinner) but is marked stale
so exactly **one** background refetch runs per app launch, not per navigation.
Implement it as an `onSuccess` on the persist provider that invalidates the two
catalog keys once, never with `refetchOnMount: true` — that would put us back where
we started. Net effect: 2 calls per launch instead of 2 per screen, with an instant
first paint. Ship §5–§7 first and measure before taking this.

### 8.3 Never persist

Anything keyed to another user's data or to money: the public catalog, questions,
Pedidos, chat, notifications. They are out of scope precisely because their
staleness is not ours to trade away.

---

## 9. Tests

The real cost of this epic. Six files render pages that will now need a
`QueryClientProvider`.

### 9.1 `src/test/renderWithProviders.tsx` (new)

```tsx
/**
 * A fresh QueryClient per test. Sharing one would let a cache entry written by an
 * earlier test satisfy a later one, and the failure looks like a passing test.
 */
export function renderWithProviders(ui: ReactElement, { route = '/' } = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: Infinity } },
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}
```

`retry: false` is required — with retries on, an assertion about a rejected action
races the retry timer.

### 9.2 Files to update

`CatalogPage.test.tsx`, `InstagramImport.test.tsx`, `HomePage.test.tsx`,
`ProfilePage.test.tsx`, `LoginPage.test.tsx`, `SignupPage.test.tsx`,
`NotificationsContext.test.tsx`, `ChatContext.test.tsx` — anything that mounts
`AuthProvider` or an affected page. Each keeps its `vi.mock` of the **action
module**, which is what CLAUDE.md's strategy prescribes and what keeps the dev-stage
mocks out of the picture entirely. Only the render wrapper changes.

Two existing assertions to watch, both of which should still pass and both of which
are the epic's thesis in test form:

- `HomePage.test.tsx:282` — `expect(fetchMyCatalog).toHaveBeenCalledTimes(1)`.
- `InstagramImport.test.tsx:407` — `fetchCatalogItems` called twice (initial +
  post-import invalidate) while `fetchInstagramPosts` is called once.

`CatalogPage.test.tsx:136` holds `fetchMyCatalog` pending to assert the spinner —
still correct on a cold client.

### 9.3 New tests to add

| Test | Where | Asserts |
|---|---|---|
| Home → Catalog → Home reads the catalog once | new `src/sections/catalog/__tests__/CatalogCache.test.tsx` | `fetchMyCatalog` / `fetchCatalogItems` called once across three mounts |
| Opening the import dialog does not re-read `/status` | `InstagramImport.test.tsx` | `fetchInstagramStatus` called once for grid + dialog |
| A 201 with `nextAvailable` disables the button without a `/status` read | `InstagramImport.test.tsx` | button disabled, date shown, `fetchInstagramStatus` still at 1 |
| A 429 writes the cooldown into the cache | `InstagramImport.test.tsx` | reopening lands on `cooldown` with no new `/status` |
| Logout empties the cache | new `src/sections/auth/__tests__/AuthCache.test.tsx` | after logout + re-login as another user, `fetchProfile` runs again |
| Status failure leaves the feature enabled | `InstagramImport.test.tsx` | fails open — the existing doctrine, now structural |

---

## 10. `CLAUDE.md` addendum

Add a **Caching** subsection under *Architecture*, stating:

1. Reads that the owner also writes go through `@tanstack/react-query`, keyed from
   `src/lib/queryKeys.ts`. If it is not in that file, it is not cached.
2. **A mutation writes its response into the cache; it does not invalidate.**
   Invalidation is for server-side writes we cannot reconstruct — currently only
   the Instagram import.
3. The global defaults (no focus/reconnect/mount refetch, `staleTime: Infinity`)
   apply to **owner-owned rows only**. Anything another user writes needs its own
   `staleTime` and a reason in the PR.
4. Logout clears both the in-memory client and the persisted store. Two users on
   one phone is an ordinary case.
5. The persisted allowlist is closed by default. Adding a key to it is a product
   decision about staleness, not a performance tweak.
6. `IS_DEV_STAGE` still branches inside the action. Queries call actions, so mocks
   are unaffected and **no new mock file is needed** for a query.

---

## 11. Sequencing and risk

| Phase | Content | Risk | Ships value alone? | Status |
|---|---|---|---|---|
| **1** | §4 — client, keys, provider, logout clear | Low. No behaviour change. | No | ✅ **shipped** |
| **2** | §7 — Instagram status | Low, high value. Isolated to two hooks, both keep their public shape. | Yes — the metered path | ✅ **shipped** |
| **3** | §6 — catalog + items | **Medium.** Touches `EditCatalogContext` (6 consumers) and `HomePage`. | Yes — the largest call reduction | ✅ **shipped** |
| **4** | §5 — profile | Low. | Marginal alone; needed for phase 5 | ✅ **shipped** |
| **5** | §8 — persistence | Medium. Rehydration of a changed type is the trap; `buster` is the guard. | Yes — warm reloads | ✅ **shipped** — see `blueprint.CachePersistence.md` |

### What phases 1–4 actually shipped

`@tanstack/react-query` 5.102.8, plus:

| File | Change |
|---|---|
| `src/lib/queryKeys.ts` | new — the closed key list from §3 |
| `src/lib/queryClient.ts` | new — `createQueryClient()`, the module-scope `queryClient`, `resetAppCache()` |
| `src/router/AppRouter.tsx` | `QueryClientProvider` inside `ToastProvider`, wrapping `AuthProvider` |
| `src/sections/auth/AuthContext.tsx` | `logout` calls `resetAppCache()` |
| `src/lib/api.ts` | the 401 give-up path calls `resetAppCache()` |
| `src/sections/catalog/hooks/useInstagramStatus.ts` | new — `instagramStatusQueryOptions()` (cooldown-aware `staleTime`) + `useInstagramStatusCache()` (`ensure` / `markEnrolled` / `markCooldown`) |
| `src/sections/catalog/hooks/useInstagramAvailability.ts` | reads the shared entry; public shape unchanged; fails open structurally |
| `src/sections/catalog/hooks/useInstagramImport.ts` | `checkEnrollment` reads through `ensure`; enroll / 201 / both 429 paths write the cache |
| `src/sections/catalog/actions/fetchInstagramStatus.ts` | `DEFAULT_COOLDOWN_DAYS` exported — it had been copied into three files |
| `src/sections/catalog/components/ProductGrid.tsx` | the post-import `refreshInstagram()` deleted; the import already wrote the date |
| `src/test/renderWithProviders.tsx` | new — fresh client per test |
| `CatalogPage.test.tsx`, `InstagramImport.test.tsx` | wrapped in the provider; 4 new `status caching` tests |

Phase 3 added:

| File | Change |
|---|---|
| `src/sections/catalogs/hooks/useOwnerCatalog.ts` | new — `useMyCatalog(enabled)` and the dependent `useCatalogItems(id, enabled)` |
| `src/sections/catalog/context/EditCatalogContext.tsx` | an adapter over the two queries; every mutation writes the API's response with `setQueryData`; `reloadItems` is the sole `invalidateQueries` |
| `src/sections/home/HomePage.tsx` | the "Mi catálogo" tile reads the same two keys, still gated on the tab flag |
| `src/sections/catalogs/__tests__/OwnerCatalogCache.test.tsx` | new — the cross-screen assertions |
| `HomePage.test.tsx` | wrapped in the provider |

**Measured on the sample session:** `/instagram/status` **3 → 1** (grid and dialog
share one entry; the post-import read is gone). `/catalog` and `/catalog/:id/items`
**4 each → 1 each** (Home and the editor share both entries; a remount reads
nothing). `/instagram/posts` is untouched at 1 — it is the billed call and must stay
that way. In-scope total on that session: **12 → 4** — one read each of profile, catalog,
items and Instagram status, which is the floor until persistence (§8) removes the
warm-reload reads too.

**Deviations from the plan**, both deliberate:

- §7.1 sketched `useInstagramStatusQuery()`. The commit exports
  `instagramStatusQueryOptions()` instead, because `useInstagramImport` needs the
  same options for `ensureQueryData` outside a render — one definition, two
  consumers, rather than a hook and a duplicated literal.
- §6.1 sketched two files, `useMyCatalog.ts` and `useCatalogItems.ts`, plus a
  `toSection` adapter in Home. Shipped as one cohesive `useOwnerCatalog.ts` (the
  two queries are a dependent pair and neither is used without the other), and the
  section shape is built inline in `HomePage` with `useMemo` — the generic adapter
  turned out to be pure pass-through, longer than the thing it wrapped.

Phase 4 added:

| File | Change |
|---|---|
| `src/sections/auth/AuthContext.tsx` | `profile` backed by `useQuery`; `hasSession` state replaces the render-time `getToken()`; `login` seeds via `fetchQuery`; `updateProfile` is a `setQueryData`; `logout` clears the **injected** client |
| `src/lib/queryClient.ts` | `resetAppCache()` narrowed by doc to non-React callers (`api.ts`'s 401 path) |
| `src/sections/auth/__tests__/AuthCache.test.tsx` | new — session-boundary and cache-write assertions |
| `LoginPage`, `SignupPage`, `ChatContext`, `NotificationsContext`, `ProfilePage` tests | wrapped in the provider |

`AuthState` is unchanged, so `ProtectedRoute`, `NavShell`, `ProfilePage` and every
`useAuth()` consumer were untouched.

**Two things Phase 4 got wrong on the first pass, both caught by tests rather than
review:**

- `logout` called `resetAppCache()`, which clears the module singleton. Under a
  test that mounts its own provider that is the *wrong client* — the session's rows
  survived logout. React code must clear the client it was injected with; the
  singleton helper is for `api.ts`, which has no context to read from. In the app
  both are the same instance, which is exactly why this would never have shown up
  by hand.
- The session flag has to be **state**, not a render-time `getToken()`. Clearing
  the cache while an observer still reads `enabled: true` is a reason for it to
  refetch — a `/profile` call for a session that just ended. `does not re-read the
  profile when the session ends` is what holds that shut.

**The Phase 3 and 4 tests are mutation-checked.** Forcing `refetchOnMount: 'always'` on
`useMyCatalog` fails the two sharing tests; swapping the deletion's `setQueryData`
for an `invalidateQueries` fails the third; removing `queryClient.clear()` from
`logout` fails two of the four auth tests. They assert on action call counts, which
is the only thing this epic is about.

Take them in that order. Phase 2 is deliberately first: it is the smallest diff,
it guards the only endpoint that costs money per call, and it proves the pattern on
a hook with a stable public interface before phase 3 touches a context with six
consumers.

**Known risks**

- **Stale data across devices.** The design bets that a seller edits from one
  device at a time. Mitigation is §8.2's boot revalidate, plus a manual pull-to-
  refresh if support ever reports it. Do not pre-emptively add a poll.
- **Cache surviving a logout.** Addressed in §4.4 and tested in §9.3. This is the
  one item on the list that is a security bug rather than a UX one.
- **A `gcTime` shorter than a session silently reverts the epic.** Called out in
  §4.2; the §9.3 three-mount test is what would catch a regression.
- **Scope creep into Pedidos and the public catalog.** They are the obvious next
  targets and they have a different staleness contract. Separate blueprint.

---

## 12. Definition of done

- [ ] The sample session in §0 issues **4** in-scope requests, verified in the
      network tab against a production build (not `StrictMode` dev).
- [ ] Opening the Instagram dialog after the catalog screen issues **no**
      `/instagram/status` request.
- [ ] A successful import disables "Importar de Instagram" with the correct date
      and issues no follow-up `/status` request.
- [ ] After a reload, the cooldown date is still on screen before any network
      call resolves.
- [ ] `npm run build`, `npm run lint`, `npm test` all clean.
- [ ] Logging out and back in as `user2@admin.com` shows **no** trace of
      `user@admin.com`'s catalog, items or profile.
- [ ] `CLAUDE.md` carries the Caching section from §10.

---

## 13. Phase 6 — the public catalog, gated by a freshness stamp (✅ shipped)

Backend contract: `followup.LocalCacheApi.md` (`GET /updated/{catalogId}`).

This is the piece phases 1–5 could not do. `queryKeys.ts` and `queryPersist.tsx` both
recorded the same refusal — *anything owned by somebody else is deliberately absent*,
because a persisted list never refetches and a product deleted elsewhere would render
forever. The stamp is the missing gate: one ~80-byte read answers "is this still the
shop?", so the payload can be cached **and** persisted.

### What a public catalog visit cost — 5 requests, not 3

The handoff counted three. Two more were in the page:

| Request | Owner | Gated by the stamp? |
|---|---|---|
| `GET /catalog/{id}` | `PublicCatalogContext` | yes |
| `GET /catalog/{id}/items` | `PublicCatalogContext` | yes |
| `GET /catalog/{id}/questions` | `CatalogFaq` | yes |
| `GET /location/catalog/{id}` | `useCatalogLocation` | **no** — not stamped server-side |
| `GET /subscription/user` | `useCatalogSubscription` | **no** — the viewer's own data |

That last one pulled the seller's *entire* subscription list on every visit to answer
one boolean. It is now a cached, owner-owned query — and it is also what bounds
persistence, so fixing it was not optional.

### Decisions taken (with the product owner)

| Decision | Taken as | Why |
|---|---|---|
| Which shops persist | **Subscribed only** | Deviates from handoff §3, which persists every shop visited and shrugs at the blob growing ("worth a cap or an LRU"). Subscription *is* the natural bound, and the honest definition of "a shop this person comes back to". A shop glanced at once stays in memory for the session. |
| Location | **Left uncached** | The API does not move the stamp when a location is edited. Caching it would go stale with nothing to catch it; a backend change could be requested later. |
| Stamp cadence | **Mount + window focus, no interval** | The win is on revisit, not on watching a shop change live. The handoff itself warns that a backgrounded tab polling a shop nobody is reading is the waste this feature exists to remove. |

### Two things the handoff's sketch would have got wrong

Both were found by tests, not review.

- **`seen` as a `useRef` misses the first change after every cold start.** The sketch
  guards on `seen.current !== undefined`, so the first stamp observed in a mount never
  triggers. That is right within a session — but a restored payload arrives with an
  empty ref, so a shop that changed while the app was closed is served stale until it
  changes a *second* time. Shipped instead as `queryKeys.catalogSynced(id)`: a cache
  entry, persisted in the same atomic blob as the payload. That is the handoff's own
  rule 2 ("store the stamp *with* the payload") made durable.
- **Persisting the live stamp, which the handoff explicitly offers, breaks the gate.**
  Restored, it equals `catalogSynced`, the comparison sees no change, and the server is
  never asked — on exactly the cold start the feature exists for. Only `catalogSynced`
  is persisted; the live value must come from the network every time.

A third, ours rather than the handoff's: the stamp query needed `refetchOnMount: true`
to override the app-wide `refetchOnMount: false`. Without it the entry stayed in memory
from the previous visit and nothing ever re-asked.

### Mutation coverage

| Mutation | Fails |
|---|---|
| gate never invalidates | `refetches the whole shop…`, `…moves backward…` |
| `>` instead of `!==` | `refetches when the stamp moves backward, not only forward` |
| baseline adoption removed | 6 of 7 (first visit double-fetches) |
| `refetchOnMount: false` | 4 of 7 |
| allowlist ignores subscription state | `does not persist a shop the viewer only visited`, `drops a shop…` |
| `catalogSynced` not persisted | `persists a subscribed shop with the stamp its copy matches` |
| live stamp persisted | `never persists the live freshness stamp` |

### Still open

**The catalog location is not stamped.** `followup.LocalCacheApi.md` calls it "a small
backend change, ask for it". Until it lands, `/location/catalog/{id}` is one
un-eliminable request per public catalog visit.

### Phase 6b — the location (✅ shipped, with a bound)

The location was the one visitor-facing read the stamp does not cover, and it was
fetched twice over: `useCatalogLocation` for the public jumbotron and a second
`useEffect` inside `EditCatalogScreen`. Both now share one cache entry.

It could not be put behind the gate, because editing a location moves nothing — a
cached-under-the-stamp location would serve the old address until some *unrelated*
change happened to move the stamp, which is worse than not caching it: it looks
correct and is not. So it is bounded by **time**:

| | |
|---|---|
| `staleTime` | 5 minutes — repeat views in a session are free; a corrected address still reaches a browsing visitor |
| Persisted | **Never.** Only the `public` and `synced` scopes reach disk, so the window cannot span a reload |
| Gate | Invalidated when the stamp moves for another reason. Belt and braces, not a guarantee |
| Owner edits | `LocationEditDialog`'s `onSaved` writes the API's response into the cache — no refetch to confirm a save |

**A stale address is the only staleness in this epic with a cost in the physical
world** — a buyer can drive to it. Every other cached field is a wrong price or a
missing photo: visible, and self-correcting on the next stamp. That asymmetry is
why the bound is short and why nothing goes on disk.

`followup.CatalogLocationStamp.md` is the request to close it properly. When it
lands the fix is ~10 lines, all deletion: drop `LOCATION_STALE_MS`, move
`queryKeys.catalogLocation` under the `publicCatalog` prefix, add the `location`
scope to the persistence allowlist.

Mutation-checked: removing the `staleTime` fails both location tests; removing the
gate's location invalidation fails one; allowing the `location` scope onto disk
fails `never persists a catalog location`.
