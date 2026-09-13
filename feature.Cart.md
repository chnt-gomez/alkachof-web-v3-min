# Feature: Shopping Cart

Buyer-side shopping cart for public catalogs. Visitors collect items from a catalog,
review them in a drawer, and check out — converting the cart into purchases and opening
a hand-off transaction with the seller (consumed later by the Transactions feature,
see `feature.TransactionsPage.md`).

## Product decisions (resolved)

| Decision | Choice |
|----------|--------|
| Who uses it | Public catalog visitors on `/catalog/:catalogId` |
| Anonymous users | Guest cart in `localStorage`; login required only at checkout, guest lines are then replayed to the server |
| UI surfaces | Floating cart button + bottom-sheet drawer on the public catalog page, plus a protected `/cart` page listing all the user's carts |
| Post-checkout | Inline confirmation view (order summary + "el vendedor confirmará tu pedido"); no navigation to transactions yet |
| Sizes | **Not** part of a cart line — the API's `CartItem` is `{ itemId, quantity }` only |

## Backend contract

Source of truth: `alkachof-api/api/controller/cartController.js`, `services/cartService.js`,
schemas in `api/config/swagger.js`. All five endpoints require a bearer token.

| Endpoint | Body | Response | Notes |
|----------|------|----------|-------|
| `GET /cart` | — | `200 { carts: Cart[] }` | All the user's carts, one per catalog |
| `POST /cart/add` | `{ itemId, quantity }` | `201 { message, cart }` | Resolves/creates the cart from the item's catalog. **Increments** if the line exists |
| `POST /cart/:cartId/remove` | `{ itemId }` | `200 { message, cart }` | Removes the **entire line** (no decrement) |
| `POST /cart/:cartId/delete` | — | `200 { message }` | Deletes the whole cart |
| `POST /cart/:cartId/checkout` | — | `201 { message, purchases: string[], transaction }` | One `Purchase` per line, one `Transaction` (status `STARTED`), then deletes the cart |

```ts
type CartLine = { itemId: string; quantity: number }
type Cart = {
  id: string            // NOTE: `id`, not `_id` (server maps it)
  ownerId: string
  catalogId: string
  items: CartLine[]
  discountCodeApplied: string | null   // placeholder, always null for now
}
type Transaction = {
  id: string
  purchaseIds: string[]
  buyerId: string
  sellerId: string
  status: 'STARTED' | 'REJECTED' | 'PROCESSING' | 'READY-FOR-PICKUP' | 'EN-ROUTE' | 'DELIVERED' | 'RETURNED'
  dateCreated: string
  dateUpdated: string
}
```

### API constraints that shape the UI

1. **No set-quantity endpoint.** Increment = `POST /cart/add` with the delta. Decrement /
   set = `remove` then `add` with the new absolute quantity (two sequential calls; if the
   second fails, refetch the cart and surface the error — acceptable for v1).
2. **Cart lines carry no item data.** The UI must join `CartLine.itemId` against item
   details fetched via the existing `fetchCatalogItems(catalogId)` (public, unauthenticated).
3. **The server never validates stock** at add or checkout. The client caps quantity at
   `item.stock` and blocks adding items with `stock === 0`.
4. **Cart price total is computed client-side** from joined item prices (cents, `es-MX`,
   MXN — same `formatPrice` pattern as `CatalogItemList`).
5. Sellers can technically add their own items to a cart; no client guard needed for v1.

## Frontend architecture

New section `src/sections/cart/` following the sections pattern, plus a global provider
(cart state spans the public catalog page and `/cart`, which live in different route trees).

```
src/sections/cart/
├── CartPage.tsx                     # protected /cart route: all carts grouped by catalog
├── context/
│   └── CartContext.tsx              # global CartProvider + useCart()
├── actions/
│   ├── fetchCarts.ts                # GET /cart
│   ├── addToCart.ts                 # POST /cart/add
│   ├── removeFromCart.ts            # POST /cart/:cartId/remove
│   ├── deleteCart.ts                # POST /cart/:cartId/delete
│   └── checkoutCart.ts             # POST /cart/:cartId/checkout
├── components/
│   ├── CartDrawer.tsx               # bottom sheet (pattern: ProductDetailDialog overlay)
│   ├── CartFloatingButton.tsx       # fixed bottom-right button + line-count badge
│   ├── CartLineItem.tsx             # thumbnail, name, unit price, qty stepper, remove
│   ├── CartCatalogGroup.tsx         # one catalog's cart on /cart: lines + total + CTA
│   ├── CheckoutConfirmation.tsx     # post-checkout success view
│   └── EmptyCart.tsx                # empty state
└── __tests__/
    └── CartPage.test.tsx
```

### CartContext (`CartProvider` / `useCart()`)

Mounted in `AppRouter.tsx` inside `AuthProvider` (it reads `useAuth().isAuthenticated`),
wrapping `<Routes>` so both the public catalog page and `/cart` see it.

Two storage backends behind one interface, selected by auth state:

- **Guest (anonymous):** `localStorage` key `alkachof.guestCart` holding
  `Record<catalogId, CartLine[]>`. All mutations are synchronous and local.
- **Server (authenticated):** the five actions above; state is the server's `Cart[]`
  refreshed from each mutation's response (`add`/`remove` return the updated cart).

Exposed API (shape, not final code):

```ts
type CartState = {
  carts: Cart[]                                  // guest carts are materialized into the same shape (id = catalogId, ownerId = 'guest')
  linesFor(catalogId: string): CartLine[]
  countFor(catalogId: string): number            // badge = sum of quantities
  addItem(item: Item, quantity: number): Promise<void>
  setQuantity(catalogId: string, itemId: string, quantity: number): Promise<void>  // remove+add on server
  removeLine(catalogId: string, itemId: string): Promise<void>
  clearCart(catalogId: string): Promise<void>    // /delete on server
  checkout(catalogId: string): Promise<CheckoutResult>  // throws if guest — callers gate on isAuthenticated first
  isMutating: boolean
}
```

**Guest→server merge on login:** an effect watches `isAuthenticated` going `false → true`;
it replays every guest line via `POST /cart/add`, then clears `alkachof.guestCart`.
Because `/cart/add` increments, merging into a pre-existing server cart adds quantities
together — documented, acceptable v1 behavior. Replay failures keep the guest copy and
show a toast (`useToast`).

### Routing changes (`src/router/AppRouter.tsx`)

- Wrap `<Routes>` with `<CartProvider>` (inside `AuthProvider`).
- Add `<Route path="/cart" element={<CartPage />} />` under `NavShell` + `ProtectedRoute`.
- Optionally add a `Carrito` tab (icon `ShoppingCart` from lucide) to `NavShell`'s `TABS`.

### Public catalog integration (`src/sections/publicCatalog/`)

- **`ProductDetailDialog.tsx`:** add a quantity stepper (min 1, max `item.stock`) and a
  primary button `Agregar al carrito` (disabled + `Sin existencias` when `stock === 0`).
  On add: close dialog, show toast `Agregado al carrito`. Adding is allowed for guests —
  no login prompt here.
- **`PublicCatalogPage.tsx`:** render `<CartFloatingButton catalogId={catalogId} />` +
  `<CartDrawer>` after the content. Button hidden while `countFor(catalogId) === 0`.
- **`CartDrawer`:** bottom sheet (same overlay pattern/classes as `ProductDetailDialog`:
  `fixed inset-0 … items-end`, panel `max-h-[90vh] overflow-y-auto rounded-t-2xl`).
  Shows this catalog's lines (`CartLineItem`), subtotal, and CTA:
  - Authenticated → `Finalizar pedido` runs `checkout(catalogId)`, then renders
    `CheckoutConfirmation` inside the sheet.
  - Guest → `Inicia sesión para completar tu pedido` navigates
    `navigate('/login', { state: { from: location.pathname } })` — `LoginPage` already
    honors `state.from`; the guest cart merges on login and the buyer returns to the
    catalog with the cart intact.

Cart line thumbnails follow the golden image rules: `object-contain` + `w-full` inside a
fixed-**width** (never fixed-height) column, e.g. `w-16 shrink-0`.

### `/cart` page (`CartPage.tsx`)

1. On mount (authenticated by route guard): context already fetched `GET /cart`.
2. For each cart, fetch catalog name + items via existing public actions
   `fetchPublicCatalog(catalogId)` / `fetchCatalogItems(catalogId)` to join line data.
3. Render one `CartCatalogGroup` per cart: catalog title, `CartLineItem` rows, total,
   `Vaciar carrito` (with confirm) and `Finalizar pedido` per group — one cart = one
   seller = one independent checkout.
4. Empty state (`EmptyCart`): `Tu carrito está vacío` + hint to browse a catalog.
5. Successful checkout replaces that group with `CheckoutConfirmation`.

### `CheckoutConfirmation`

Rendered from local pre-checkout line data (the API returns only purchase ids):
- Title `¡Pedido enviado!`, item summary with quantities and total.
- Seller hand-off info from the catalog: `payOptions` / `deliveryType` / `location`
  (labels in Spanish: `Pago: efectivo, transferencia…`, `Entrega: recolección…`).
- Note: `El vendedor confirmará tu pedido.` Transaction id shown small for reference.
- No link to transactions yet (that's `feature.TransactionsPage.md`).

## Dev-stage mocks (`src/mocks/`)

Per CLAUDE.md rules — one file per action, same imported types, re-export from
`src/mocks/index.ts`, Spanish user-visible strings, `Promise.resolve` only:

| Mock | Behavior |
|------|----------|
| `mockFetchCarts` | Returns the in-memory store (below) |
| `mockAddToCart` | Upserts into store (increment semantics), returns the cart |
| `mockRemoveFromCart` | Removes the line, returns the cart |
| `mockDeleteCart` | Drops the cart |
| `mockCheckoutCart` | Returns fake purchase ids + a `STARTED` transaction, drops the cart |

To make the authenticated flow exercisable in dev stage, these five mocks share a
**module-level in-memory `Map<catalogId, Cart>`** (`src/mocks/mockCartStore.ts`). This
stays within the mock rules: no network, no timers, synchronous resolution — it just
persists across calls within a session.

## Tests

Per CLAUDE.md strategy — page-level, `MemoryRouter`, `vi.mock` the action modules,
assert on DOM output, English descriptions:

- `sections/cart/__tests__/CartPage.test.tsx`: renders carts joined with item data;
  quantity change calls remove+add; checkout renders the confirmation; empty state.
- Extend `sections/publicCatalog/__tests__/`: detail dialog adds to (guest) cart,
  floating button badge count, drawer renders lines and the guest login CTA.
- Guest storage: tests run unauthenticated by default (no token in jsdom localStorage),
  so the guest path is the natural default; clear `localStorage` in `beforeEach`.

## Edge cases

- **Stale guest lines:** an item deleted/out-of-stock since it was added — when joining
  fails (id missing from fetched items), drop the line silently; when `quantity > stock`,
  clamp and show `Cantidad ajustada por disponibilidad`.
- **Checkout failure** (network / cart drifted): show the `ApiError` message in a toast,
  refetch carts.
- **`quantity` must stay ≥ 1** in the stepper; hitting 0 = remove line (with the
  remove-then-add caveat this is just `remove`).
- **Multi-tab guests:** last write wins on `localStorage`; no sync listener in v1.

## Out of scope (v1)

- Sizes/variants on cart lines (API doesn't support them).
- Discount codes (`discountCodeApplied` is a server placeholder).
- Buyer notes at checkout (API accepts none).
- Transactions list / status tracking → `feature.TransactionsPage.md`.
- Stock reservation or server-side stock checks.

## Implementation order

1. Actions + types + mocks (incl. `mockCartStore`) — pure plumbing, no UI.
2. `CartContext` with guest backend only; wire provider into `AppRouter`.
3. `ProductDetailDialog` stepper + add button; `CartFloatingButton` + `CartDrawer`.
4. Server backend in `CartContext` + guest→server merge on login.
5. `/cart` route + `CartPage` + `CheckoutConfirmation`.
6. Tests + `npm run build` + `npm run lint`.

---

# Amendment 1: Cart book-tag on the public catalog page

Replaces the floating cart button with an always-visible "book-tag" — a bookmark-style
tab protruding from the right edge of the public catalog page, like a ribbon marker
sticking out of a book.

## Product decisions (resolved)

| Decision | Choice |
|----------|--------|
| Visibility | **Always visible** from the moment a visitor lands on `/catalog/:catalogId` (not only after the first add) |
| Count badge | Shows the cart's total quantity for this catalog; hidden while the count is 0 (icon-only tag) |
| Click action | Opens the existing `CartDrawer` on the same page (works for anonymous visitors; the drawer already handles the empty state, checkout, and the guest login redirect) |
| Old button | `CartFloatingButton` is **deleted** — the book-tag is the single cart entry point on the catalog page |

## Visual spec

A `<button>` fixed to the right viewport edge, flush against it, rounded only on the
left side so it reads as a tab emerging from the edge:

```tsx
<button
  className="fixed right-0 top-1/3 z-40 flex items-center gap-1.5 rounded-l-xl
             bg-primary py-2.5 pl-3 pr-2 text-primary-foreground shadow-lg
             transition-transform active:scale-95"
  aria-label={`Ver carrito (${count} artículos)`}
>
  <ShoppingCart size={20} />
  {count > 0 && (
    <span className="flex h-5 min-w-5 items-center justify-center rounded-full
                     bg-destructive px-1 text-xs font-bold text-destructive-foreground">
      {Math.min(count, 99)}
    </span>
  )}
</button>
```

- **Position:** `right-0 top-1/3` — right edge, upper third, clear of the drawer's
  bottom-sheet area and of thumbs resting at the screen bottom. Tweakable token.
- **Shape:** `rounded-l-xl` with square right side flush to the edge = book-tag look.
- **Layering:** `z-40`, below the drawer/dialog overlays (`z-50`), same tier as other
  fixed chrome.
- **Badge:** inline next to the icon (not offset-overlapped like the old button),
  capped at `99`. Rendered only when `count > 0`.
- **Colors:** theme tokens only (`bg-primary`, `text-primary-foreground`,
  `bg-destructive`) — no new CSS.

## Behavior

- Rendered in the success branch of `PublicCatalogContent` (never during loading /
  not-found / error states), exactly where `CartFloatingButton` sits today.
- `onClick` sets the existing `isDrawerOpen` state → `CartDrawer` opens. With an empty
  cart the drawer shows its existing "Tu carrito está vacío" state, which is acceptable.
- Count comes from `useCart().countFor(catalogId)` — already reactive to guest and
  server mutations; no context changes needed.

## File changes

| File | Change |
|------|--------|
| `src/sections/cart/components/CartBookTag.tsx` | **New** — component per spec above; same `{ catalogId, onClick }` props as the old button, minus the `count === 0 → null` early return |
| `src/sections/cart/components/CartFloatingButton.tsx` | **Delete** |
| `src/sections/publicCatalog/PublicCatalogPage.tsx` | Swap import + usage `CartFloatingButton` → `CartBookTag` |

No changes to `CartContext`, `CartDrawer`, actions, mocks, or routes.

## Tests

Page-level, in `src/sections/publicCatalog/__tests__/` per the testing strategy
(`vi.mock` the action modules, assert on DOM):

- Tag (role `button`, name matching `Ver carrito`) is in the document as soon as the
  catalog loads, with **no** numeric badge.
- After adding an item via the detail dialog, the badge shows the quantity.
- Clicking the tag renders the drawer content ("Tu carrito" heading).

## Implementation order

1. Create `CartBookTag`, swap it into `PublicCatalogPage`, delete `CartFloatingButton`.
2. Tests + `npm run build` + `npm run lint`.
