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
- `/login`, `/signup`, `/recover`, `/reset/:token`, `/verify/:token` → auth pages

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

It talks to two backend endpoints (both mocked in dev stage per the mock rules): `GET /transaction/all?role&status&limit&skip` (→ `TransactionListResult`) and `GET /transaction/:id/purchases` (→ `PurchaseLine[]`). Money is cents everywhere; format with `formatPrice`. Deferred (Phase 2): action buttons in the detail dialog wired to the existing `/transaction/:id` status/code/confirm endpoints.

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


