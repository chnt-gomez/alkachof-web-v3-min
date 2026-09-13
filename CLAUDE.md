# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start dev server (Vite)
npm run build     # type-check + production build
npm run lint      # ESLint
npm run preview   # serve the production build locally
```

## Architecture

Small-screen-first e-commerce platform. All UI targets phone resolutions — no desktop layouts.

### Stack

- **Vite 6** + **React 19** + **TypeScript 5.8**
- **Tailwind CSS v4** via `@tailwindcss/vite` — no `tailwind.config.js`; theme tokens live in `src/index.css` under `@theme {}`
- **Shadcn-style** UI primitives in `src/components/ui/` (hand-written, not CLI-generated); uses `cva`, `clsx`, `tailwind-merge`, `@radix-ui/react-slot`
- **React Router v7** — routes declared in `src/router/AppRouter.tsx`

### Routing

All routes are registered in `src/router/AppRouter.tsx`. Adding a section = create the folder + register one `<Route>` there.

Current routes:

Public:
- `/catalog/:catalogId` → `PublicCatalogPage` (visitor view of a catalog by id)
- `/login`, `/signup`, `/recover`, `/reset`, `/verify` → auth pages (the reset/verify code is typed into a form field, not read from a URL param)

Protected (wrapped in `NavShell` + `ProtectedRoute`):
- `/` → `HomePage`
- `/catalog` → `CatalogPage` (owner's own catalog editor — resolved from the auth token, no id in the URL)
- `/product/:id` → `ProductPage`
- `/transactions` → `TransactionsPage` (the "Pedidos" tab — buyer/seller order history, product orders *and* service requests)
- `/requests` → redirect to `/transactions` (retired route kept alive for notifications stored with the old path)
- `/profile` → `ProfilePage`

- `*` → `NotFoundPage`

Note: each user owns exactly one catalog. `/catalog` (no id) is the owner editing their own catalog; `/catalog/:catalogId` is the public visitor view. **The shopping cart has no route** — it's a client-side drawer accessible from within the `PublicCatalogPage`.

### Notification deep links

The API owns the route shapes it sends in `notification.metadata.navigationUrl`
(`api/services/navigationUrlService.js` in `alkachof-api` — single file, single owner).
Orders and service requests both deep-link to the Pedidos page:

```
/transactions?highlight=<transactionId|requestId>&role=<buyer|seller>
```

`role` is the *recipient's* side of the deal — without it the page opens on Ventas and a
buyer's row isn't in the list it fetched. `useTransactionDeepLink` reads both params,
switches tabs, then scrolls to and pulses the card. **If a route shape changes here, change
`navigationUrlService.js` too** — already-stored notifications keep the path they were
created with, so retired paths need an alias route (see `/requests`).

### Sections pattern

Each feature lives in `src/sections/<name>/`:

```
sections/<name>/
├── <Name>Page.tsx      # route-level orchestrator component
├── components/         # section-local presentational components
└── hooks/              # section-local custom hooks
```

`<Name>Page.tsx` is the only file imported by the router. Everything else is internal to the section.

### Theming

CSS custom properties are defined in `src/index.css` using Tailwind v4's `@theme {}` block (e.g. `--color-primary`, `--color-muted-foreground`). Components reference these via Tailwind utilities like `bg-primary`, `text-muted-foreground`. Do not add a `tailwind.config.js` — extend the theme in `index.css` instead.

### Caching (TanStack Query)

Reads that **the owner also writes** go through `@tanstack/react-query`. Blueprint:
`blueprint.LocalCaching.md`.

- **`src/lib/queryKeys.ts` is the closed list of cache keys.** If a query is not in
  that file, it is not cached. Anything *another user* writes — the public catalog,
  questions, Pedidos, chat, notifications — is deliberately absent: those rows have
  a different staleness contract and must not inherit the defaults below.
- **`src/lib/queryClient.ts` inverts every library default** — `staleTime: Infinity`,
  no refetch on focus / reconnect / mount, `retry: 1`. This app runs on a phone on
  mobile data, and the cached rows change only through mutations this client
  performs. Do not re-enable a refetch trigger without a reason in the PR. `gcTime`
  must stay longer than a session: with `refetchOnMount: false`, a collected entry
  refetches on the next mount and silently undoes the cache.
- **A mutation writes its response into the cache; it does not invalidate.** The
  mutations already return the updated row — put it in the cache with
  `setQueryData`. An invalidation is an admission that the server changed something
  we cannot reconstruct; today that is exactly one path (the Instagram import
  creating items, via `reloadItems`), and it should stay countable.
- **Logout clears the cache** (`resetAppCache`, called from `logout` and from the
  401 give-up path in `api.ts`). Security, not housekeeping: the client is
  module-scope, so it outlives the React tree, and two users on one phone is an
  ordinary case for this product.
- **`IS_DEV_STAGE` still branches inside the action.** Queries call actions, so the
  mocks are unaffected and **a query needs no new mock file**.
- **Tests build their own client per test** — `src/test/renderWithProviders.tsx`.
  Never share one: an entry written by an earlier test would satisfy a later one's
  query and the test would pass for the wrong reason.

**Shipped:** `/profile`, the owner's catalog and its items, and `/instagram/status`,
plus persistence across reloads. See `blueprint.LocalCaching.md` and
`blueprint.CachePersistence.md`.

`AuthProvider` backs `profile` with a query but its `AuthState` is unchanged, so
`useAuth()` consumers see nothing new. Two rules it encodes:

- **`logout` clears the client it was injected with**, not `resetAppCache()`. In
  the app they are the same instance; under a test that mounts its own provider
  the singleton is the wrong client. `resetAppCache()` is for `api.ts`, which has
  no context to read from.
- **Whether a session exists is React state, not a render-time `getToken()`.**
  Clearing the cache while an observer still reads `enabled: true` is a reason for
  it to refetch — a `/profile` call for a session that just ended.

#### The owner catalog entries

`src/sections/catalogs/hooks/useOwnerCatalog.ts` owns the pair. Home's "Mi
catálogo" tile and the catalog editor read the **same** two keys, so moving
between Inicio and Catálogo costs nothing and the editor's second visit skips its
spinner entirely.

- `EditCatalogProvider` is an adapter over those entries, not a store. Its
  exported `EditCatalogState` is unchanged, so its six consumers were untouched.
- **Every mutation there writes the API's response with `setQueryData`** —
  create, update and delete included. `reloadItems` is the app's only
  `invalidateQueries`, and it earns it: an Instagram import creates rows the 201
  describes only in summary.
- `useCatalogItems` is a dependent query — disabled until `useMyCatalog` yields
  an id. It reads the **authenticated** `/catalog/:id/items`; the public visitor
  view uses a different action and is not cached. Do not point it at this key.

#### The Instagram status entry

`useInstagramStatus.ts` owns the shared `/instagram/status` read. `ProductGrid`
(via `useInstagramAvailability`) and the import dialog (via
`useInstagramImport`) read the same entry, so the screen costs one status request
instead of three.

- **Freshness is the cooldown itself**: the entry stays fresh until
  `nextAvailable` passes. The client's clock decides only when to re-read an
  *unmetered* endpoint — it never decides whether the seller may import. The date
  shown is still the server's string and the gate is still the API's 429.
- **Every server answer about the gate is written into the cache** —
  `enrollInstagram` ok/409, a 201 carrying `nextAvailable`, and a 429 from either
  metered route. That is why `ProductGrid` no longer refreshes the status after an
  import: the button is already disabled by the time the dialog reports back.
- **`/instagram/posts` is never cached.** It is the billed scraper run, and
  opening the dialog stays the only thing that reads it.

#### Persistence (`src/lib/queryPersist.tsx`)

The profile and the Instagram status survive a reload; nothing else does.

- **`PERSISTED_KEYS` is an allowlist, never "everything that succeeded".** Adding a
  key is a decision about staleness, not a performance tweak. The **owner's own**
  catalog and items are held back: nothing gates them, so a product deleted on
  another device would render here forever. Never persist Pedidos, chat,
  notifications, the catalog's **location** (editing it does not move the freshness
  stamp), an Instagram `mediaUrl`, or `/instagram/posts`.
- **A *public* catalog persists only while the viewer subscribes to it** — see the
  freshness section below. Subscription is the bound on blob size; persisting every
  shop a visitor opens would need an LRU.
- **The `buster` is `__CACHE_BUSTER__`, injected per build by `vite.config.ts`.**
  Nothing validates a rehydrated row's shape, so a cached type that gains a field
  would surface as a runtime error on the boot path. A hand-maintained version
  constant only works if every author remembers to bump it; deriving it from the
  build makes that impossible to forget. Do not replace it with a literal.
- **Restore is synchronous and hand-rolled on purpose.**
  `PersistQueryClientProvider` restores through a promise, and for that tick the
  profile query has no data — which `ProtectedRoute` reads as "not authenticated"
  and bounces a signed-in user to /login. `restoreFromDisk()` runs in a `useState`
  initialiser, before children render. The *write* half is still
  `persistQueryClientSubscribe`, so throttling and dehydration stay library-owned.
- **Persistence is off in dev stage**, and not as a preference: the dev mocks keep
  their state in module variables that reset on reload, so a persisted
  `/instagram/status` would contradict `mockInstagramStore` and pin the session to
  the cooldown screen.
- **The blob is dropped on every session end** — `logout`, the 401 give-up path in
  `api.ts`, and a `storage` event from another tab. That last one is not optional:
  without it this tab re-persists the previous user's rows after a logout elsewhere.

#### Public catalog freshness (`GET /updated/:catalogId`)

Contract: `followup.LocalCacheApi.md`. Every catalog has one timestamp that moves
whenever anything a visitor can see about it changes — metadata, image, items, and
any question asked or answered. Reading it is ~80 bytes and needs no auth, which is
what makes someone else's shop cacheable at all.

`usePublicCatalogFreshness` owns the gate; `PublicCatalogContext` and `CatalogFaq`
hold the three payloads it covers, under the `queryKeys.publicCatalog(id)` prefix.

- **Compare for inequality, never ordering.** `!==`, not `>`. The stamp is the
  server's wall clock; if it ever steps backward, `>` pins the client to stale data
  permanently while `!==` self-heals on the next write.
- **`catalogSynced` records which stamp the cached payload matches, and is
  persisted with it.** A `useRef` would do within one mount but dies on reload, and
  a restored payload with no recorded stamp cannot be checked — the first change
  after a cold start would be missed entirely.
- **The *live* stamp (`catalogStamp`) is never persisted.** Restored, it would equal
  `catalogSynced`, the gate would see no change, and the server would never be
  asked. It must come from the network on every cold start.
- **`refetchOnMount: true` and `refetchOnWindowFocus: true` override the app
  defaults, and both are load-bearing.** With the app's `refetchOnMount: false` the
  entry would still be in memory from the last visit and nothing would ever ask the
  server again. **No interval poll** — a backgrounded tab polling a shop nobody is
  reading is the waste this feature removes.
- **There is no error case.** An unknown, deleted or never-edited catalog all answer
  `200` with the epoch; that is an ordinary comparison token, not "not found"
  (`GET /catalog/:id`'s 404 owns that). On a network failure keep serving the cache
  — a failed check is not evidence anything changed.
- **One stamp covers metadata, items and questions together.** Any change refetches
  all three; per-item stamps do not exist.
- **The catalog's location is not covered by the stamp**, so it is bounded by
  *time* instead: `staleTime` of 5 minutes in `useCatalogLocation`, and **never
  persisted** (`queryPersist` allows only the `public` and `synced` scopes), so the
  window cannot span a reload. A stale address is the one staleness here with a
  cost in the physical world. The gate does invalidate it when the stamp moves for
  another reason — belt and braces, not a guarantee. `followup.CatalogLocationStamp.md`
  is the ask to fix this properly; when it lands, delete `LOCATION_STALE_MS`, move
  the key under the `publicCatalog` prefix and allow the `location` scope on disk.
- In dev stage `mockCatalogStampStore` mirrors the server's stamp and every mutating
  mock bumps it, so the invalidation path is exercised by hand rather than frozen.

### Versioning

Every build says what it is, on two surfaces that can be read **without opening
the app** — `vite.config.ts`'s `alkachof-version` plugin owns both:

- **`<meta>` tags in `index.html`** — `app-version`, `build-sha`, `build-time`.
  View-source on app.alkachof.mx and the answer is there.
- **`/version.json`** — the same four fields, machine-readable, for a deploy
  check or an uptime probe. Emitted unhashed on purpose: a fingerprinted name
  would be unfindable.

The facts come from two clocks, and both halves are needed. `version` is
`package.json`'s, **owned by a human** and bumped with `npm version` — it is what
a release is called out loud. `sha` and `builtAt` are **derived from the build**
and so cannot be forgotten, which is what makes them trustworthy when it matters:
"0.4.0" covers every deploy made under it, and the sha names exactly one commit.
A build from a dirty tree is marked `-dirty`, because it corresponds to no commit
at all.

Rules:

- **nginx must not cache `/version.json` or `index.html`.** A confidently wrong
  answer from a week-old cache is worse than no endpoint. `Cache-Control:
  no-cache` on both; the hashed assets under `/assets/` stay immutable.
- **`__CACHE_BUSTER__` is now the build id** (`version+sha.timestamp`), so the
  persisted-cache buster and the version are the same fact. The timestamp is
  load-bearing — rebuilding one commit is ordinary, and the buster must differ on
  every build. Do not reduce it to the sha.
- **A build with no `.git` reports `sha: "unknown"` rather than failing.** The
  build may legitimately run from a tarball or a Docker context that excluded it.
- **Read the injected globals through `src/lib/version.ts`**, never directly —
  they are undefined under any runner that does not replicate the `define` block.
  `vitest.config.ts` pins all four to fixed strings so no assertion depends on
  the machine's git state.
- `logVersion()` prints one line at boot. It stays: view-source is not available
  on the phones this app runs on, and a remote-inspected console is how a build
  gets identified when a seller reports something.
- Nothing is shown to end users. If an "Acerca de" line ever wants it,
  `VERSION_LABEL` (`v0.1.0 (a1b2c3d)`) is the string.

### Path alias

`@/` maps to `src/` (configured in both `vite.config.ts` and `tsconfig.app.json`).

### Language

All text **visible to the end user** (labels, messages, placeholders, tooltips, error strings rendered in the UI) must be written in **Spanish**. The target audience is Latin American users. Use `es-MX` locale for formatting (e.g. currency).

Everything developer-facing stays in English: code identifiers, comments, variable names, file names, test descriptions, and log messages.

### Testing

**Stack:** Vitest + React Testing Library + jsdom. Setup file at `src/test/setup.ts` (imports `@testing-library/jest-dom`).

**Commands:**
```bash
npm test          # single run
npm run test:watch  # watch mode
```

**File location:** co-locate tests inside the section under `__tests__/`:
```
sections/<name>/
└── __tests__/
    └── <Name>Page.test.tsx
```

**Strategy:** Test at the page level by rendering `<NamePage>` inside a `MemoryRouter`. Mock action modules with `vi.mock` — never mock the context or individual components. Assert on DOM output (text, roles), not component internals.

**Do not test** presentational components in isolation — the page-level integration test covers their output.

**Test descriptions** stay in English (developer-facing).

### Component locations

Key components and their file paths for quick reference:

| Component | Path |
|-----------|------|
| `PublicCatalogPage` | `src/sections/publicCatalog/PublicCatalogPage.tsx` |
| `CatalogJumbotron` | `src/sections/publicCatalog/components/CatalogJumbotron.tsx` |
| `CatalogItemList` | `src/sections/publicCatalog/components/CatalogItemList.tsx` |
| `ProductDetailDialog` | `src/sections/publicCatalog/components/ProductDetailDialog.tsx` |
| `CatalogFaq` | `src/sections/publicCatalog/components/CatalogFaq.tsx` |
| `PublicCatalogContext` | `src/sections/publicCatalog/context/PublicCatalogContext.tsx` |
| `CartDrawer` | `src/sections/cart/components/CartDrawer.tsx` |
| `GuestCheckoutPrompt` | `src/sections/cart/components/GuestCheckoutPrompt.tsx` |
| `InstagramImportDialog` | `src/sections/catalog/components/InstagramImportDialog.tsx` |
| `TransactionsPage` | `src/sections/transactions/TransactionsPage.tsx` |
| `TransactionDetailDialog` | `src/sections/transactions/components/TransactionDetailDialog.tsx` |
| UI primitives | `src/components/ui/` (`button.tsx`, `card.tsx`) |
| Shared formatters | `src/lib/format.ts` (`formatPrice` cents→MXN, `formatDate` es-MX) |

### Shopping cart section (`src/sections/cart/`)

The shopping cart is **entirely client-side**: items are added, updated, and removed without any backend calls. State persists in `localStorage` (key: `alkachof.cart`) across browser reloads. Only the `checkout` operation calls the backend.

**Architecture:**
- `CartProvider` wraps the whole app and manages cart state via `useCart()` hook
- Cart state is organized by catalog: `StoredCart` is `Record<string, CartLine[]>` (catalogId → items)
- Only `checkout` makes a backend call via `checkoutCartAction`; all other operations are synchronous

**Operations (all from `useCart()`):**
- `addItem(item, quantity)` — adds or increments an item in the catalog's cart
- `setQuantity(catalogId, itemId, quantity)` — sets quantity to a value; quantity ≤ 0 removes the line
- `removeLine(catalogId, itemId)` — removes a single line item
- `clearCart(catalogId)` — empties the entire cart for a catalog
- `linesFor(catalogId)` — returns `CartLine[]` for a catalog (empty if no cart)
- `countFor(catalogId)` — returns total item count (sum of quantities)
- `checkout(catalogId)` — sends items to backend and clears the local cart on success

**CartDrawer component** is the UI that renders the shopping cart as a drawer (not a page). It's only visible when a user is on a catalog page.

### Public catalog & guest (unauthenticated) access

The public catalog (`/catalog/:catalogId`) is reachable without logging in. `PublicCatalogPage` sits inside `AuthProvider`, so its components use `useAuth()` to gate behavior:

- **Guests may browse and add items to the cart** — the cart is client-side (`localStorage`) and requires no account.
- **Checkout is the auth gate.** In `CartDrawer`, a guest who taps "Finalizar pedido" gets the `GuestCheckoutPrompt` dialog (encourages "Crear cuenta" / "Ya tengo cuenta", passing the catalog path as `location.state.from` so login returns them here). No checkout backend call is made for guests. Authenticated users check out normally.
- **The "Suscribirme" button (`CatalogJumbotron`) renders only for authenticated users** — hidden entirely for guests.
- **Questions (`CatalogFaq`) has no answer/flag action UI.** The owner-only "Responder"/flag controls were removed for _all_ users; answering questions will be handled in a separate effort. The section still renders questions read-only, keeps the "Haz una pregunta" form (auth-gated) and still hides `inappropriate`-flagged questions from non-owners.

### Transactions section (`src/sections/transactions/`)

The "Pedidos" page (4th `NavShell` tab) lists the user's transactions split by role — **Compras** (buyer) and **Ventas** (seller) — with status-chip filtering, "Cargar más" pagination, and a per-transaction detail dialog. State lives in the `useTransactions` hook (role/filter/skip pagination, accumulates pages); no Context — it's a read-mostly page. `Transaction` is a domain type owned here (`types.ts`) and re-exported from `src/sections/cart/types.ts`.

It talks to these backend endpoints (all mocked in dev stage per the mock rules): `GET /transaction/all?role&status&limit&skip` and `GET /transaction/history?…` (both → `TransactionListResult`), plus `GET /transaction/:id/purchases` (→ `PurchaseLine[]`). Money is cents everywhere; format with `formatPrice`. Deferred (Phase 2): action buttons in the detail dialog wired to the existing `/transaction/:id` status/code/confirm endpoints.

#### The feed is filtered: active vs history (`OrdersScope`)

The API leaves **finished** orders (`DELIVERED`/`REJECTED`/`RETURNED` for products, `COMPLETED`/`REJECTED`/`CANCELED` for services) and ones with **no activity for 5 days** out of `/{entity}/all`, so this screen stays short without anything being deleted — an order belongs to both parties, so one side clearing their view must never destroy the other's record. `/{entity}/history` is the same shape over everything and is the **only** route to an archived row.

`useOrdersFeed` owns a single `scope: OrdersScope` (`'active' | 'history'`) and passes it to **both** halves, which must switch together — a screen showing active products beside archived services would be incoherent. The `ScopeToggle` in the page header flips it; the empty active list also offers a way in, and words itself as *"no tienes … activas"* rather than the history's absolute *"aún no has recibido …"*, because a user whose orders are all archived still has orders.

**Both halves paginate now.** `/request/all` used to return every request as a bare `{ requests }`; it returns a page envelope (`RequestListResult`) and at most `limit` rows, so nothing may treat that array as complete — read `total`. `useRequests` therefore accumulates pages exactly like `useTransactions`, and `loadMore` asks only the halves that still have rows (asking an exhausted one refetches its last page and duplicates rows). Both hooks dedupe on append via `appendNew`: skip-based paging over a dataset where rows can un-archive mid-session can legitimately hand back a row the client already holds.

The client **never** applies the archive rule itself — the server owns it. The one exception is `src/mocks/ordersArchive.ts`, which mirrors `api/util/orderFeedQuery.js` so the dev stage behaves like production; **keep the two in step** (same arrangement as `imagePresets.ts`). Full contract: `followup.OrdersFeedPagination.md`.

### Instagram import (`src/sections/catalog/`, Apify)

"Importar de Instagram" in `ProductGrid` turns a seller's Instagram photos into
catalog items. Contract: `followup.InstagramImportApi.md`. The whole flow lives in
`InstagramImportDialog` over `useInstagramImport`, against five `/instagram/*`
actions (`fetchInstagramStatus`, `searchInstagramProfiles`, `enrollInstagram`,
`fetchInstagramPosts`, `importInstagramPosts`). `ProductGrid` itself calls
`useInstagramAvailability` to decide whether to offer the button at all.

**Why this was rebuilt.** It ran on Phyllo, an aggregator over Instagram's Graph
API. Instagram retired the Basic Display API in December 2024, and Graph reads
media only for Business/Creator accounts linked to a Facebook Page — which
Alkachof's nano/micro sellers do not have. The integration was not degraded for
them, it was inapplicable. The API now reads **public profiles** through an Apify
scraper. There is no SDK, no OAuth, and nothing Instagram-related in the browser:
`src/lib/phylloConnect.ts` is gone and no script is injected.

Three consequences shape the whole screen:

- **A private account cannot be read at all.** Not degraded — unavailable. It has
  its own terminal screen (`InstagramPrivateNotice`) with no retry button,
  because retrying does nothing until the seller changes a setting on Instagram.
- **Ownership cannot be proven.** The control is policy: the seller attests, and
  importing someone else's content is a terms violation. The engineering guard is
  that enrollment is **permanent**.

- **Every feed read is billed.** Apify charges per actor run, and nothing about a
  request bounded how often a seller made one — importing, closing the dialog and
  reopening it paid for another run immediately, with no ceiling. A **successful**
  import now holds the seller's next run for `cooldownDays` (7). See *The
  cooldown* below.

**Enrollment is a three-screen wizard, once per account.** `useInstagramImport`
is a phase machine — `checking → searching → picking → attesting → browsing` —
with backward edges at every step, because only the final commit is irreversible.
An enrolled seller skips all of it and lands on `browsing`.

**The first screen is a lookup, not a search.** The API runs Apify's profile
scraper, which takes exact usernames — neither actor does fuzzy name matching —
so `/instagram/search` resolves one handle and returns zero or one candidate.
`InstagramProfilePicker` is therefore a *confirmation card* rather than a list to
choose from; it keeps the list shape so a future by-name lookup would not need a
new component. **Do not word the UI as a name search** — it would promise
something the actors cannot do.

Rules this screen must keep:

- **The linked handle is never displayed.** The API does not return it: `/status`
  answers `{ enrolled }` and nothing more. There is no "conectado como @x" line,
  and adding one would require an endpoint that does not and must not exist.
- **`searchInstagramProfiles` is the only action that names an account**, and the
  API refuses it once a row exists — a seller gets one lookup session in the
  lifetime of their account. Never add a client-supplied profile to any other
  call: `fetchInstagramPosts()` takes no arguments **on purpose**.
- **The attestation checkbox is never pre-ticked**, and the commit stays disabled
  until it is. The sentence comes from the API (`attestation.template` +
  `placeholder`) and is rendered, never composed here — what gets stored has to
  be what was displayed. The client sends `attested: true` and never the text.
- **Say that enrollment is permanent** where the seller commits. There is no
  unlink endpoint, and a wrong handle needs support to fix.
- **Private candidates render but are not selectable** — dimmed, with the reason.
  Hiding them makes the seller think their account was not found and retype the
  same handle forever.
- **`mediaUrl` is a CDN link that expires.** It goes into an `<img>` and nowhere
  else: never persisted, never sent back to the API, never stored against an
  item. The imported product's image is a separate copy in Alkachof's storage.
- **Only `mediaType === 'IMAGE'` posts are selectable**, and already-imported
  ones are disabled. Both stay visible but dimmed. (The API could import a
  `VIDEO` through its poster frame; the client declines to, by product decision.)
- **201 is not "everything landed".** Every selection comes back in `imported` or
  `skipped`; `InstagramImportSuccess` shows both, and `skipReasonLabel` translates
  the API's English reasons. Reopening the dialog is the fix for every skip
  reason — it fetches fresh.
- **An import ends the session.** `runImport` moves to the terminal `done` phase
  and **does not re-read the feed**: refetching would spend a metered scraper run
  repainting badges on a screen the seller is leaving. A clean import closes the
  dialog itself after `AUTO_CLOSE_MS`; a **partial** one waits for a tap, because
  the skipped list is the only place those reasons appear and a screen that
  vanishes mid-read is worse than one extra tap. The success toast is fired
  before the close so the confirmation outlives the dialog.
- **The cap is the catalog's remaining space, never a number of its own.** A
  seller may select every photo that still fits — `MAX_CATALOG_ITEMS` (25) minus
  the items they already have — and the copy says both numbers when it is short,
  because "elige hasta 22" with no reason reads as an arbitrary Instagram rule.
  `remainingCatalogSlots` is the source; `ProductGrid` passes `itemCount` and
  `useInstagramImport` clamps it against `MAX_POSTS_PER_IMPORT`, which *is* the
  same 25 (the API's `INSTAGRAM.MAX_CONVERT_BATCH`). A smaller batch would refuse
  photos the catalog had room for and make the seller wait a cooldown for the
  rest, which is the one thing this screen must not do. One import at a time (it
  runs for seconds and shares the upload rate budget).
- **A full catalog closes the entry point.** `ProductGrid` disables "Importar de
  Instagram" at 25 items and says why — opening the dialog is what spends the
  billed scraper run, and a seller with nowhere to put an item can only reach a
  screen with nothing selectable on it.
- **`src/lib/catalogLimits.ts` mirrors the API's `CONSTANTS.CATALOG.MAX_ITEMS`**
  (hoisted there as `MAX_CATALOG_ITEMS`, because the import batch is sized from
  it). Keep the two in step — same arrangement as `imagePresets.ts`.
- Imports use the API's defaults — name from the caption's first line, price 0 —
  so a new item is priced afterwards like any other unpriced one.
- **One bounded page, no "Cargar más", and no refresh control.** The scraper has
  no resume cursor into Instagram, so a second page means re-scraping from the
  top and paying again. There was an "Actualizar" button; it is gone. It was the
  one gesture on the screen that cost money, and it bought nothing — the feed is
  fetched fresh on every open, and posts do not change between two taps. **Opening
  the dialog is the only thing that reads the feed**, which is why `loadPosts` is
  not exposed by `useInstagramImport`. Do not add a refresh, a poll or a
  pull-to-refresh here.

**The cooldown.** A successful import (≥1 item created) holds the seller's next
scraper run for `cooldownDays`, and the API enforces it with a 429 on both
`/posts` and `/convert`. What the client owes:

- **Ask `/status` before offering the feature.** It is the one unmetered endpoint
  — `useInstagramAvailability` calls it from `ProductGrid`, disables the button
  and prints the date. This is the courtesy, not the control; a stale
  `available: true` just meets the 429 one screen later. It **fails open**: a
  status read that errors must not remove a working feature.
- **Say it before the import, not after.** The browsing screen carries *"Solo
  puedes importar una vez cada N días"* above the grid, because a seller gets one
  pass and the photos they leave unselected wait a week. Learning that on the
  success screen is learning it too late. `cooldownDays` comes from the API so
  this copy cannot drift from the gate.
- **A 429 is terminal.** `InstagramCooldownNotice`, with the date and no
  "Reintentar" — same shape as the private-account screen, for a different
  reason. Never compute the date locally; the client's clock is not what enforces
  the gate.
- **`InstagramImportSuccess` may not say "try again" when `summary.nextAvailable`
  is set.** Every skip reason is fixed by refetching the feed, and a successful
  import is exactly what blocks that refetch. Show the date instead.
- **Only a successful import starts it**, so a batch that imported nothing leaves
  the seller's next run intact — `nextAvailable` on the 201 says which happened.
- **Known gap:** feed reads *before* a seller's first import are still ungated —
  `nextAvailable` only moves on a successful import, so closing and reopening the
  dialog pays for a fresh run each time. Removing the refresh button narrowed
  this to two taps rather than one; closing it needs a second rule. See *Not
  included* in the contract.

**In dev stage** `mockInstagramStore` starts *un-enrolled*, so the wizard is what
you see first; `mockEnrollInstagram` flips it. The store also mirrors
`nextAvailable`, so importing anything reaches the disabled button and the
cooldown screen without a backend — both reset on reload. The lookup is **exact-handle only**,
mirroring the API, so a partial name resolves to nothing there too — type
`la_tienda_de_ana` for the happy path, or `tienda_ana_privada` to reach the
private-account screen.

### Notifications section (`src/sections/notifications/`)

App-wide live notifications (contract: `followup.LiveNotificationsApi.md`). `NotificationsProvider` (mounted in `AppRouter` inside `AuthProvider`) owns the list: on login it fetches `GET /notification/recent` (REST is the source of truth) and opens a best-effort **Socket.IO v4** connection to the `/live` namespace on the API origin (`connectLiveSocket` in `liveSocket.ts`, JWT via `auth.token`). `notification:new` prepends + toasts; every socket `connect` re-syncs from REST (missed events are not replayed); `connect_error: Unauthorized` refreshes the token and reconnects; logout disconnects. `markSeen` is optimistic (`POST /notification/:id/seen`, 404 drops the row).

Consumers: `useNotifications()` → `{ notifications, status, unseen, reload, markSeen }`. The `NavShell` header bell shows the `unseen` badge; `HomePage` renders the list via the presentational `NotificationList` (in `src/sections/home/components/`). The `Notification` type and `notificationLink()` (metadata → route) live in `actions/fetchNotifications.ts`. **In dev stage the socket is a no-op** — only the mocked REST fetch runs, so live pushes never arrive; `liveSocket.ts` guards on `IS_DEV_STAGE` itself and has no mock file (it makes no HTTP calls).

### Development stage

The UI supports a **development stage** that bypasses the backend entirely. This is the default when running `npm run dev`.

**How it works:** `src/lib/stage.ts` exports `IS_DEV_STAGE`, which reads the `VITE_DEV_STAGE` env var. When `true`, every action returns mock data instead of making HTTP calls. `.env.development` sets `VITE_DEV_STAGE=true`, so the dev server always runs in dev stage automatically.

**Mock structure:**

```
src/mocks/
├── index.ts                        # re-exports all mock generators
├── random.ts                       # shared helpers: pick(), randomInt(), randomId()
├── mock<ActionName>.ts             # one file per action
└── ...
```

**Rules for every new action:**

1. **Every action that makes an HTTP call must have a paired mock generator** in `src/mocks/mock<ActionName>.ts`.
2. **The mock must import and return the same type** as the real action — never redefine the type.
3. **Branch at the top of the action function** with a two-line guard:
   ```ts
   import { IS_DEV_STAGE } from '@/lib/stage'
   import { mockFetchMyThing } from '@/mocks'

   export async function fetchMyThing(id: string): Promise<MyThing> {
     if (IS_DEV_STAGE) return mockFetchMyThing(id)
     // ... real fetch
   }
   ```
4. **Mock generators return `Promise.resolve(data)` — no `setTimeout`, no real server, no network.** Data is created inline using helpers from `random.ts`.
5. **User-visible strings in mocks must be in Spanish (es-MX)** — names, descriptions, locations, etc. Identifiers and file names stay in English.
6. **Re-export the new mock from `src/mocks/index.ts`** so callers import from `@/mocks` only.
7. **Tests are not affected.** Tests `vi.mock` the action module directly, which replaces it entirely before the `IS_DEV_STAGE` branch is ever reached. Never change tests to accommodate mock files.

## Golden rules

### Image display

Images are the primary marketing channel for sellers. Violating these rules degrades the product.

- **Never use `object-cover`** on product images — it crops content.
- **Never apply a fixed height** to an image container — it forces blank space or cropping when the aspect ratio doesn't match.
- **Always use `object-contain` + `w-full`** so the image scales to fit its column width while preserving its natural aspect ratio and expanding the container vertically.
- For dialogs showing enlarged product images: cap the dialog at `max-h-[90vh]` with `overflow-y-auto` so very tall images remain scrollable without overflowing the viewport.

### Image uploads

Every pick is shrunk on the client before it is sent (`src/lib/resizeImage.ts`),
so a 5 MB phone photo leaves the device at ~150 KB. This saves the user's upload
bandwidth on mobile data and keeps the resize work off the cheap VPS.

- **`ImageUploadField` requires a `preset`** — `profiles` (512² square crop),
  `products` (1200) or `catalogs` (1600). It bounds the pick in *both* modes:
  upload-now and deferred (`onFileSelect`), because a deferred file is submitted
  as-is by its parent form.
- **Optimising is a visible phase.** The field shows *"Optimizando imagen para
  internet…"* while it shrinks, because on a low-end phone this takes seconds and
  would otherwise look like a frozen picker. The work does not block the UI — the
  decode runs off the main thread and the encode is async.
- **A form containing an image field must disable its submit while the field is
  busy.** Pass `onBusyChange` and fold it into the button's `disabled`. In
  deferred mode the resized file *is* what the form sends, so saving mid-optimise
  submits without the image. `ItemFormDialog` and `EditCatalogScreen` do this;
  `ProfilePage` needs no guard because its image persists on its own endpoint
  with no adjacent submit.
- **`src/lib/imagePresets.ts` mirrors the API's `CONSTANTS.IMAGE`** in
  `alkachof-api/api/constants/constants.js`. Keep the two in step.
- **`resizeImage` never throws.** Every failure path — no `createImageBitmap`, a
  codec the canvas cannot encode, a HEIC the browser cannot decode — returns the
  original file. The API re-encodes whatever it receives, so this stays a pure
  optimisation. **Never assume an uploaded file is already bounded.**
- Output is WebP, and the API accepts JPEG/PNG/WebP. Bad uploads answer 400 with
  a readable message (this used to be an opaque 500).

### Product grid layout

Use a **CSS `columns-2`** masonry layout (not `grid grid-cols-2`) for product lists. This stacks items down each column so cards with different image heights never leave trailing blank cells.

```tsx
<ul className="columns-2 gap-3">
  <li className="mb-3 break-inside-avoid"> … </li>
</ul>
```

### Test data.
Data has been seeded for testing the UI
Public Catalog available ids: 6a0365fdf74fdcb617a8a5b6, 6a0365fdf74fdcb617a8a5c3, 6a0365fdf74fdcb617a8a5d0

Users/Passwords:    user@admin.com / password
                    user2@admin.com / password
                    user3@admin.com / password


