# Blueprint — Product / Service Item Type (web client)

Implementation plan for `feature.ProductServiceType.md` (which embeds the backend handoff
`followup.ProductServiceTypeApi.md`). Grounded in the current code: `src/sections/catalog/`,
`src/sections/publicCatalog/`, `src/sections/cart/`, `src/sections/transactions/`.

---

## 0. Reality check — what the backend actually has today

Verified directly against `/Volumes/BANK/Projects/alkachof/alkachof-api` (commit `5e5e115`), not
just the handoff document:

| Capability | Backend state | Evidence |
|---|---|---|
| `item.type` on create / read / update, immutable | ✅ **live** | `api/models/itemSchema.js:17`, `api/services/itemService.js:37` |
| Cart / checkout reject service items (**400**) | ✅ **live** (phase 2) | handoff §3b, exercised against a running API |
| `/request` endpoints (booking flow) | ✅ **live** (phases 3–4) | build guide §4, verified against a running server; served under the **Requests** tag in `/api-docs` |
| Transaction statuses changed | ❌ unchanged | `transactionService.js:19-29` — same 7 statuses |
| Swagger shows `type` | ❌ pending | phase 5 |

The "new status fields" the feature asks us to use in Compras/Ventas are the **Request** statuses —
now **seven** of them: `REQUESTED` / `PRICED` / `ACCEPTED` / `SERVING` / `COMPLETED` / `REJECTED` /
`CANCELED`. The work shipped in these increments:

- **Phase A — ✅ shipped.** Item type end-to-end: create picker, service rendering, cart exclusion,
  "Solicitar" wired to a real (non-`/request`) action. Plus the owner gate (§3.9).
- **Phase A2 — ✅ shipped** once backend phase 2 landed. The checkout rejection is caught, explained
  and repaired — see §3.8. This is the only part of phase 2 that needed client work; the rest was
  already covered by Phase A's cart exclusion.
- **Phase A3 — ✅ shipped**, preparing for the request flow. "Solicitar" now collects the buyer's
  note (`ServiceRequestDialog`) and delivers it to the seller through chat. This is deliberately
  ahead of the backend: it makes the note real today, and it is **the reason for the contract
  change request in §7** — raised while the Request shape is still cheap to move.
- **Phase B — ✅ shipped.** The whole Requests stack (types, actions, mocks, the merged Pedidos
  feed, detail dialog with the seller's pricing form).
- **Phase C — ✅ shipped.** The `/request` endpoints went live, so the feature flags
  (`src/lib/features.ts`) and the chat fallback in `useServiceRequest` are **deleted**: "Solicitar"
  now calls `POST /request/create` for real, and the request actions use the ordinary
  `IS_DEV_STAGE` guard like every other action. See §4 for the shipped contract, which differs from
  the draft this blueprint was originally written against.

> **Where the draft was wrong.** Phases A3 and B were built against a draft contract that has since
> been superseded. Three things moved, and are corrected throughout this document: the quoted status
> is **`PRICED`** (not `PRICE`); there is a distinct **`ACCEPTED`** step between the buyer accepting
> and the seller starting work; and the note field is **`customerNote`** (not `note`). Building ahead
> was still the right call — it is what surfaced the `PRICE`/note contract requests in the first
> place — but the rename tax is real and worth remembering next time.

---

## 1. Scope at a glance

| # | Change | Files |
|---|---|---|
| 1 | `Item.type` in the domain type + `isService()` / `formatItemPrice()` helpers | `publicCatalog/actions/fetchCatalogItems.ts`, `lib/format.ts` |
| 2 | Type picker on **create**, read-only badge on **edit** | `catalog/components/ItemFormDialog.tsx` |
| 3 | Send `type` on create; never send it on update | `catalog/actions/createItem.ts`, `catalog/actions/updateItem.ts` |
| 4 | Service rendering: badge, "Precio a convenir", no stock chip | `CatalogItemList`, `ProductGrid`, `ProductPage`, `ProductDetailDialog` |
| 5 | Detail dialog: drop stepper, swap CTA to **Solicitar** for services | `publicCatalog/components/ProductDetailDialog.tsx` |
| 5b | **Solicitar** collects the buyer's note before sending | `publicCatalog/components/ServiceRequestDialog.tsx`, `hooks/useServiceRequest.ts` |
| 6 | Cart refuses services (add-guard + read-time filter of stale localStorage) | `cart/types.ts`, `cart/context/CartContext.tsx` |
| 7 | Requests domain: types, status meta, transitions, actions, mocks | new `src/sections/requests/` |
| 8 | Pedidos merges orders + requests into one feed per role | `transactions/hooks/useOrdersFeed.ts`, `components/OrdersList.tsx`, `orderStatusFilter.ts` |
| 9 | Notification deep-link handles `?request=<id>` | `transactions/hooks/useTransactionDeepLink.ts` |
| 10 | Mocks emit services; new request mocks | `src/mocks/*` |
| 11 | Tests | `__tests__` in the touched sections |

**Out of scope:** service search/filtering in the catalog, scheduling/calendar, buyer
counter-offers, request pagination, request push notifications (backend defers all of these).

---

## 2. Decisions taken

| Decision | Taken as | Why |
|---|---|---|
| `Item.type` optionality | `type?: ItemType` in TS, checked only via `isService()` | The feature spec explicitly says a missing type = product. The handoff says it is always present; making it optional costs nothing, keeps every existing `Item` literal in tests/mocks compiling, and satisfies both. |
| Type check direction | `item.type === 'service'`, never `!== 'product'` | Handoff §2 — fails safe on an unexpected value. Centralised in one helper so it is checked in exactly one place. |
| Type on the edit form | Read-only badge + explanatory line, no control | Handoff §2: a control that can only ever 400 must not exist. |
| `type` on update requests | Stripped inside `updateItem()` | `ProductGrid` and `ProductPage` both PATCH the whole form payload. Sending the *same* type is legal, but stripping is one line in one file vs. auditing every call site forever. |
| Service price `0` | Rendered "Precio a convenir", never `$0.00` | Handoff §3. A non-zero service price renders normally (list price). |
| `outOfStock` on services | Hidden everywhere | Services have no stock. The field still exists on the wire; we just never render it for a service. |
| Cart exclusion | UI guard **and** read-time filter | The cart is localStorage — a buyer may already hold a service line from before this ships, and the server-side backstop is not built. Two cheap guards, no migration. |
| `CartLine.type` | Added, optional | Lets `linesFor()` drop stale service lines. Legacy lines have no type → treated as product → kept. |
| Requests UI location | Sub-tab inside `/transactions`, not a new route | The feature says "use them in the Ventas/Compras screen". Keeps one "Pedidos" tab in `NavShell`. |
| Requests list vs. merge | **Merged into one feed per role** (reversed — see §4.3) | Originally split under a Productos / Servicios toggle. Product overruled: a request made *to* you is a sale and one made *by* you is a purchase, so role is the only division that means anything to a user. The obstacles were real and are solved rather than dodged — see §4.3. |
| `/request` wiring | Live, no flag | Shipped and verified by backend. The flags that carried it while it was dark are deleted. |
| Solicitar | `POST /request/create` with the buyer's note, then navigate to Compras → Servicios | The chat fallback that carried this while `/request` was unbuilt is deleted. A double-submit guard replaces it, since the API has no find-or-create. |
| Status copy | Spanish, client-owned, in `requests/components/statusMeta.ts` | Mirrors `transactions/components/statusMeta.ts` exactly (answer to backend open question #4: **keep copy client-side**). |

---

## 3. Phase A — item type, end to end

### 3.1 `src/sections/publicCatalog/actions/fetchCatalogItems.ts`

The `Item` type is the single source of truth for items (every other module re-exports it).

```ts
/** 'product' = stock-backed good bought through checkout.
 *  'service' = no stock, price may be quoted on request. Immutable after creation. */
export type ItemType = 'product' | 'service'

export type Item = {
  _id: string
  name: string
  description: string
  price: number
  imgPath: string
  outOfStock: boolean
  updatedOn: string
  catalogId: string
  /** Absent on items created before this field shipped — treat as 'product'. */
  type?: ItemType
}

/** The one place item type is interrogated. Fails safe: anything not
 *  explicitly 'service' is a product. */
export function isService(item: Pick<Item, 'type'>): boolean {
  return item.type === 'service'
}
```

`isService` takes `Pick<Item, 'type'>` so it also accepts a `CartLine` (§3.6) without a cast.

### 3.2 `src/lib/format.ts`

```ts
/** Display price for an item. A service with no price set (`0`) has no price
 *  yet — the amount is agreed between buyer and seller on the request. */
export function formatItemPrice(item: { price: number; type?: ItemType }): string {
  if (isService(item) && item.price === 0) return 'Precio a convenir'
  return formatPrice(item.price)
}
```

Importing `isService`/`ItemType` from a section into `lib/` inverts the current dependency
direction. Cleanest fix: move `ItemType` + `isService` into `src/lib/item.ts` and re-export them
from `fetchCatalogItems.ts` for existing importers. **Do that** — `lib/` is where cross-section
primitives already live (`format.ts`, `shareUrl.ts`).

While here: `CatalogItemList`, `ProductGrid`, `ProductPage`, `ProductDetailDialog` and `CartDrawer`
each carry a private copy of `formatPrice`. Replace all five with the `lib/format` imports as part
of this change — they all need `formatItemPrice` anyway.

### 3.3 `ItemFormDialog.tsx` — the type picker

Payload gains the type:

```ts
export type ItemFormPayload = {
  name: string
  description: string
  price: number
  outOfStock: boolean
  image: File | null
  /** Create mode only — the backend rejects a type change on update. */
  type: ItemType
}
```

State: `const [type, setType] = useState<ItemType>(initial?.type ?? 'product')`.

**Create mode** renders a segmented control above the name field (two `role="radio"` buttons in a
`role="radiogroup"` labelled `Tipo`), styled like the `StatusFilterChips` chips:

```
┌──────────────┬──────────────┐
│  Producto    │   Servicio   │
└──────────────┴──────────────┘
```

**Edit mode** renders a static badge instead, plus the reason:

> Servicio · El tipo no se puede cambiar después de crear el artículo.

Type-dependent copy and validation inside the dialog:

| | Producto | Servicio |
|---|---|---|
| Title | `Nuevo producto` / `Editar producto` | `Nuevo servicio` / `Editar servicio` |
| Name placeholder | `Nombre del producto (opcional)` | `Nombre del servicio (opcional)` |
| Price label | `Precio (pesos)` | `Precio (pesos, opcional)` |
| Price help text | — | `Déjalo vacío si prefieres acordar el precio con cada cliente. Es lo más común en servicios.` |
| Price placeholder | `Ej. 350` | `Acordar con el cliente` |
| Image required on create | yes (current rule) | yes — keep the rule uniform |
| `Sin existencias` checkbox | edit mode only (current) | never rendered |
| Error copy | `…el producto.` | `…el servicio.` |

The price field already defaults to `0` when left blank (`validate()` starts `priceCents = 0`), so
the "service falls back to price 0" requirement needs no logic change — only the help text so the
user understands *why* leaving it blank is the recommended choice.

The help text is a persistent line under the field, not a hover tooltip: this is a phone-only UI
(CLAUDE.md) and there is no hover. Style it `text-xs text-muted-foreground`.

### 3.4 `createItem.ts` / `updateItem.ts`

`NewItemData` gains `type: ItemType`, and the multipart body gains one line:

```ts
form.append('type', type)
```

`updateItem` strips the field before sending, with the reason recorded:

```ts
// The backend rejects any update that changes an item's type (400). Callers
// PATCH the whole form payload, so drop the field here rather than at every
// call site — the type is immutable, so it can never need updating.
const { type: _ignored, ...safePatch } = patch
```

Call sites: `ProductGrid.tsx:101` passes the create payload through — add `type`;
`ProductGrid.tsx:93` and `ProductPage.tsx:92` pass the edit payload to `updateItem` — no change
needed once the strip is in the action.

### 3.5 Rendering services (owner + public)

| Component | Change |
|---|---|
| `CatalogItemList` (public grid) | `formatItemPrice(item)`; `Servicio` chip (neutral `bg-secondary`) on service cards; skip the `Sin existencias` chip when `isService(item)` |
| `ProductGrid` (owner list) | same three changes; header count becomes `N artículo(s)`; buttons become `Agregar artículo` / `Agregar primer artículo` |
| `ProductPage` | `formatItemPrice`; suppress `Sin existencias`; title fallback `Servicio sin nombre` for services |
| `CatalogItemList` empty state | `Sin artículos aún.` |

Image rules are untouched — `object-contain` + `w-full`, `columns-2` masonry (CLAUDE.md golden
rules). Services get no special image treatment.

### 3.6 `ProductDetailDialog` — the Solicitar path

Split the CTA block by type. Products keep today's stepper + `Agregar al carrito` exactly as-is.
Services render:

```
Corte de cabello                 ← name
Precio a convenir                ← formatItemPrice
[Servicio]                       ← chip
Incluye lavado                   ← description
┌───────────────────────────────┐
│          Solicitar            │   ← full-width primary, no stepper
└───────────────────────────────┘
El precio se acuerda directamente con el vendedor.   ← only when price === 0
```

The quantity stepper, `isAdding` state and `addItem` call are simply not rendered for a service —
there is no "disabled" middle ground to reason about.

`onSolicitar` lives in `publicCatalog/hooks/useServiceRequest.ts`, so this dialog and any future
card-level CTA share it:

```
guest?      → GuestCheckoutPrompt with service copy ("Crea una cuenta para solicitar"),
              location.state.from = the catalog path, checked BEFORE the note form so
              nobody writes a brief only to hit the sign-up wall.
owner?      → blocked by useOwnerGuard (§3.9) — you cannot request your own service;
              the API 400s on it too.
otherwise   → ServiceRequestDialog collects the note → createRequest(item._id, note)
              → toast "Solicitud enviada. El vendedor te enviará un precio."
              → navigate('/transactions')
```

Create errors are mapped to buyer-readable Spanish in `messageFor()` rather than surfaced raw:
self-request, not-a-service, and 404 each get their own line, everything else a generic retry.

### 3.7 Cart exclusion

`cart/types.ts` — `CartLine` gains `type?: ItemType` (snapshot, like `name`/`price`/`imgPath`).

`CartContext.tsx`:

```ts
// Services are booked through a request, never bought through checkout. The
// UI never offers "add to cart" for one, so reaching here means a stale
// localStorage line or a bug — refuse it quietly rather than corrupting the cart.
const addItem = async (item: Item, quantity: number) => {
  if (isService(item)) return
  …  // snapshot `type: item.type` into the new line
}
```

and `linesFor` filters at read time, which covers carts already sitting in `localStorage`:

```ts
return (cart?.items ?? []).filter((line) => !isService(line))
```

Filtering in `linesFor` (rather than purging on load) automatically fixes `countFor`, the drawer,
the badge and the checkout total, since all of them flow through it. The stale line stays in
storage but is invisible and never checked out; it is dropped the next time the cart is written.

Nothing else in the cart changes — `checkoutCart` sends `itemId` + `quantity`, and phase 2 adds the
server-side guard behind it (§3.8).

### 3.8 Phase A2 — surviving the phase-2 rejection

Backend phase 2 makes `/cart/checkout` answer **400** `"Service items cannot be purchased through
checkout"` when any line is a service, atomically (no purchases created, not even for the product
lines) and carrying the offending `itemId`.

The read-time filter in §3.7 handles every line the client itself wrote. **It cannot handle the one
case that actually matters:** a service added to the cart between backend phase 1 shipping and
Phase A shipping. During that window the UI still offered "Agregar al carrito" on services, and the
line it wrote carries **no `type`** — so `isService` reads it as a product and the filter passes it
straight through to a checkout that now always 400s. That is precisely the "user who cannot work
out why is a support ticket" case the handoff warns about, and the server's `itemId` is the only
way to identify it.

So the rejection is treated as recoverable, not as an error:

| Layer | Behaviour |
|---|---|
| `checkoutCart` | Recognises the 400 by message + status and rethrows it as a typed `ServiceInCartError` carrying `itemId` (`null` if absent). Any other failure passes through untouched. |
| `CartContext.checkout` | On `ServiceInCartError` with an `itemId`, removes that line from the stored cart and rethrows. Deliberately does **not** toast — the drawer says something better. A rejection naming no item leaves the cart alone. |
| `CartDrawer` | Renders an inline `role="alert"`: *"Quitamos «‹nombre›» de tu carrito — es un servicio… No se hizo ningún cargo: puedes finalizar tu pedido con el resto."* The remaining lines and the checkout button stay put, so the retry is one tap. |
| `mockCheckoutCart` | Mirrors the rule so dev stage matches the contract. |

The atomicity guarantee is what makes this safe to phrase as "nothing was charged" — worth keeping
that wording in sync if the backend ever relaxes it.

### 3.9 The owner gate

Separate from item type, but the same surfaces: an owner viewing their own catalog must not be able
to buy, ask or request. `isOwner` lives in `PublicCatalogContext` (one comparison, shared by every
consumer), and `useOwnerGuard()` wraps each action.

The controls are **not** `disabled`: a disabled button fires no click, so the owner would tap it and
get silence. They carry `aria-disabled` + `opacity-50` and explain themselves via a toast when
tapped. Gated: add-to-cart and checkout, "Solicitar", and "Enviar pregunta".

---

## 4. Phase B — the Requests stack

### 4.1 No feature flag

Built behind `src/lib/features.ts` while `/request` was unbuilt; that file is **deleted** now the
endpoints are live. The actions carry the ordinary two-line `IS_DEV_STAGE` guard and a paired mock,
per the dev-stage rules in CLAUDE.md.

### 4.2 `src/sections/requests/` (new section)

```
sections/requests/
├── types.ts
├── actions/
│   ├── createRequest.ts
│   ├── fetchRequests.ts
│   └── updateRequestStatus.ts
├── components/
│   ├── statusMeta.ts
│   ├── transitions.ts
│   ├── RequestStatusBadge.tsx
│   ├── RequestCard.tsx        # rendered by the shared OrdersList
│   └── RequestDetailDialog.tsx
└── hooks/
    └── useRequests.ts
```

No `RequestsPage.tsx` — this section has no route of its own; `TransactionsPage` composes it.
(The sections pattern in CLAUDE.md assumes a page per section; note the deviation in the section's
`types.ts` header comment so the next reader is not surprised.)

**`types.ts`** — mirrors the draft contract, cents everywhere, `CANCELED` with one `L`:

```ts
export type RequestStatus =
  | 'REQUESTED' | 'SERVING' | 'COMPLETED' | 'REJECTED' | 'CANCELED'

export type ServiceRequest = {
  id: string
  serviceId: string
  buyerId: string
  sellerId: string
  catalogId: string
  status: RequestStatus
  /** Agreed price in cents. `null` until the seller quotes it. */
  finalPrice: number | null
  /**
   * The buyer's brief, written when they requested the service — what the job
   * is, so the seller can price it. `""` when they sent none; set once at
   * creation and never editable.
   */
  customerNote: string
  dateCreated: string
  dateUpdated: string | null
}
```

Named `ServiceRequest`, not `Request` — `Request` is a DOM global and shadowing it in a file that
also touches `fetch` is a trap.

The list view needs the service's name and image, which the draft response does not carry. Two
options; take the first and flag it to backend (see §7): **the list enriches client-side** via the
existing `GET /item/{itemId}` (`fetchItem`), cached per id in the hook, best-effort, exactly like
`useTransactions.resolveHeaders` resolves shop/buyer names today. Falls back to `Servicio` as a
generic label.

**`statusMeta.ts`** — same shape as the transactions one:

| Status | Label | Class |
|---|---|---|
| `REQUESTED` | Esperando cotización | `bg-secondary text-secondary-foreground` |
| `PRICED` | Cotizado | `bg-amber-100 text-amber-800` |
| `ACCEPTED` | Aceptado | `bg-blue-100 text-blue-800` |
| `SERVING` | En proceso | `bg-blue-100 text-blue-800` |
| `COMPLETED` | Completado | `bg-green-100 text-green-800` |
| `REJECTED` | Rechazado | `bg-destructive/10 text-destructive` |
| `CANCELED` | Cancelado | `bg-muted text-muted-foreground` |

**`transitions.ts`** — frontend mirror of the state machine, same API shape as the transactions
mirror (`allowedTransitions(status, role)` + `TRANSITION_ACTION_LABEL`). The transitions themselves
are **confirmed** by product (handoff §4), and the two questions this blueprint originally flagged
for sign-off are now answered: the buyer may cancel from both `REQUESTED` and `SERVING`, and either
party may complete.

| From | To | Who | Button | Carries price |
|---|---|---|---|---|
| `REQUESTED` | `PRICED` | seller | `Proponer precio` | **yes** |
| `REQUESTED` | `REJECTED` | seller | `Rechazar solicitud` | no |
| `REQUESTED` | `CANCELED` | buyer | `Cancelar` | no |
| `PRICED` | `ACCEPTED` | buyer | `Aceptar precio` | no |
| `PRICED` | `REQUESTED` | buyer | `Rechazar precio` | no |
| `PRICED` | `CANCELED` | buyer | `Cancelar` | no |
| `ACCEPTED` | `SERVING` | seller | `Iniciar servicio` | no |
| `ACCEPTED` | `CANCELED` | buyer | `Cancelar` | no |
| `SERVING` | `COMPLETED` | buyer, seller | `Marcar completado` | no |
| `SERVING` | `CANCELED` | buyer | `Cancelar` | no |

Note what the seller **cannot** do: nothing at all from `PRICED`. Once quoted, the move is entirely
the buyer's — no re-quote, no accepting their own price (the API 400s on that, and it is the whole
point of the step). A seller who wants to change a number must wait for the buyer to turn it down.

Moving into `PRICED` is the **only** transition that carries a payload; `requiresPrice(next)` is the
single predicate encoding that. Every other action is a bare status POST with `finalPrice` omitted.
That matters beyond tidiness: after `ACCEPTED` the API **silently ignores** a `finalPrice` and still
answers 200, so a 200 must never be read as "my price was applied".

For the same reason the dialog updates from the **server's echo**, not from what it sent — turning a
quote down clears `finalPrice` to `null` server-side, and only the response says so.

A `null` price renders as **"Precio a convenir"** — the same string a zero-priced service item uses.

**Re-quoting has no dedicated transition.** The buyer turns a quote down with
`{ status: "REQUESTED" }`, which clears the price and puts the request back in the seller's queue
for a fresh quote. Unlimited rounds, no quote history, and the seller re-quotes blind (there is no
"reason" field — see the open question in §7).

**Actions** — each with the standard two-line dev-stage guard and a paired mock:

```ts
createRequest(serviceId: string, customerNote: string): Promise<ServiceRequest> // POST /request/create
fetchRequests({ role, status? }): Promise<ServiceRequest[]>             // GET  /request/all
updateRequestStatus(id, status): Promise<ServiceRequest>                // POST /request/:id/status
```

`customerNote` is the buyer's brief, collected by `ServiceRequestDialog`.
`useServiceRequest.request(item, customerNote)` is the single call site. Note there is **no
find-or-create**: posting twice books twice, so the dialog locks its submit button for the whole
round trip.

Unpaginated by design (backend blueprint §5.2) — `useRequests` therefore has no `loadMore`, which
is the main reason it cannot share `useTransactions`.

### 4.3 Pedidos is one merged feed per role

Product orders and service requests share a single list. The role tabs are the only split, because
that is the only division a user recognises: a request made **to** you is a sale, one made **by**
you is a purchase.

```
Pedidos
┌─────────────┬─────────────┐        role — the only division
│  Compras    │   Ventas    │
└─────────────┴─────────────┘
[ Todos ][ Esperando cotización ][ Cotizado ][ En proceso ]…   status chips, by label
<OrdersList>  ← orders and requests interleaved, newest first
```

Merging meant solving three things the earlier split had dodged:

**1. Disjoint status enums.** Transactions have seven statuses, requests have seven others, and one
chip row cannot mean both. So the chips filter by **label**, not by enum (`orderStatusFilter.ts`).
The overlaps then do the right thing for free: "En proceso" catches both a `PROCESSING` order and a
`SERVING` request; "Rechazado" catches both `REJECTED`s — rather than showing the user two chips
that read identically. A label belonging to only one entity (e.g. "En camino", "Cotizado") switches
the other source off entirely instead of fetching rows that would all be filtered away.

**2. Mismatched paging.** Transactions paginate server-side; `/request/all` returns everything.
"Cargar más" therefore pulls the next page of *transactions only* and the merge re-sorts. The known
consequence: an older order arriving on page 2 inserts *below* requests already on screen rather
than appending at the bottom. That is correct by date, and paging the merged set is impossible
without a server-side combined endpoint.

**3. Partial failure.** Two sources means one can fail alone. `status` is `error` only when *every*
asked-for source failed, so a dead endpoint never blanks the screen; when one fails and the other
returns, the list renders with an amber `partialError` banner — showing half a feed as though it
were the whole truth is the one outcome worse than an error.

Rows are a tagged union (`OrderRow`), and each kind keeps its own card and detail dialog: they carry
genuinely different data (item count and order total vs. the buyer's brief and a quoted price), so a
single merged card would show blanks for half the rows.

Empty states distinguish *filtered*-empty ("No hay pedidos con este estado.") from actually-empty
("Aún no has realizado compras ni solicitudes."), or a chip matching nothing reads as an empty
account.

**`RequestCard`**: service name (enriched) · `RequestStatusBadge` · `formatDate(dateCreated)` ·
`finalPrice === null ? 'Precio a convenir' : formatPrice(finalPrice)` — the same string a zero-priced service item uses.

**`RequestDetailDialog`**: same skeleton as `TransactionDetailDialog` — header, badge, dates, the
service line (image + name, linking to `/catalog/{catalogId}?product={serviceId}`), the
`Contactar` chat button (reuse the `openChat` block verbatim — it only needs a counterparty id and
an alias), and the role-appropriate action buttons from `transitions.ts`. Local `currentStatus`
state so the badge updates in place, `onUpdated` back to the list, exactly as transactions do.

**The buyer's `note` is the most important thing on the seller's view** — it is what they price
from — so it sits directly under the service line in a quoted block, above the actions, not folded
away behind a disclosure. On the buyer's view it renders the same, as a record of what they asked
for. When it is empty, the block is omitted entirely rather than showing a placeholder.

### 4.4 Notification deep-links

The backend composes `metadata.navigationUrl` server-side and the client navigates to it as-is —
so "notifications behave like products" needs **no change on our side** beyond being able to land
on the target. Request notifications are deferred by backend, but when they arrive the URL will be
of the form `/transactions?request=<id>&role=<buyer|seller>`.

Generalise `useTransactionDeepLink` to `usePedidosDeepLink`: read `transaction` **or** `request`
from the query, then run the
existing switch-role → wait-for-ready → scroll → highlight → drop-the-param sequence against
whichever list is mounted. The highlight CSS class and timings are unchanged.

Tell backend the exact URL shape to build (§7) so `navigationUrlService.js` gains a
`requestUrl(requestId, role)` alongside `transactionUrl`.

### 4.5 Mocks

Every new action needs a paired generator re-exported from `src/mocks/index.ts` (CLAUDE.md dev-stage
rules), plus updates to the item mocks so services actually appear in dev:

| File | Change |
|---|---|
| `mockFetchCatalogItems.ts` | ~1 in 4 items gets `type: 'service'`, `price: 0` most of the time, `outOfStock: false`, and a service name from a new `SERVICE_NAMES` list (`Corte de cabello`, `Reparación de bicicleta`, `Clases de bordado`, `Entrega a domicilio`, `Instalación de cortinas`) |
| `mockFetchItem.ts` | same treatment so `/product/:id` and request enrichment show services |
| `mockCreateItem.ts` | pass `type` straight through from `NewItemData` (it already spreads `...fields`) |
| `mockUpdateItem.ts` | default `type: 'product'` in the base object so the spread keeps the patch's value |
| `mockRequestStore.ts` (new) | deterministic seeded requests across both roles and all five statuses, mirroring `mockTransactionStore.ts`; mutable so status changes stick within a session |
| `mockCreateRequest.ts`, `mockFetchRequests.ts`, `mockUpdateRequestStatus.ts` (new) | thin wrappers over the store, `Promise.resolve(...)`, no `setTimeout` |

All user-visible mock strings in es-MX.

---

## 5. Phase C — done

The `/request` endpoints shipped, so:

1. ✅ `src/lib/features.ts` deleted; the Servicios toggle renders unconditionally and the request
   actions use the ordinary `IS_DEV_STAGE` guard like every other action in the codebase.
2. ✅ The chat fallback in `useServiceRequest` is gone — "Solicitar" calls `POST /request/create`.
   A `sending` guard replaces it, because the API has **no find-or-create**: posting twice books
   twice, by design.
3. ⏳ The client-side item enrichment in `useRequests` stays until `GET /request/all` carries the
   service name (see §7).
4. ✅ The cart's read-time service filter is **kept**, not removed. The server-side rejection is a
   backstop; localStorage carts outlive deploys.

---

## 6. Tests

Page-level, in `MemoryRouter`, mocking action modules with `vi.mock` (CLAUDE.md strategy).

| File | Cases |
|---|---|
| `publicCatalog/__tests__/PublicCatalogPage.test.tsx` | a service item card shows `Servicio` and `Precio a convenir`; opening it shows `Solicitar` and **no** quantity stepper (`queryByLabelText('Aumentar cantidad')` is null); a product item still shows the stepper and `Agregar al carrito`; a priced service shows the amount, not "a convenir" |
| `catalog/__tests__/CatalogPage.test.tsx` | create dialog exposes the Producto/Servicio radiogroup and passes `type: 'service'` to `createItem`; choosing Servicio hides the stock checkbox and shows the price help text; the edit dialog shows the read-only badge and no radiogroup |
| `cart/__tests__/CartContext.test.tsx` | `addItem` on a service is a no-op; a pre-seeded `localStorage` cart containing a service line reports it neither in `linesFor` nor in `countFor` |
| `transactions/__tests__/TransactionsPage.test.tsx` | orders and requests interleave newest-first; no Productos/Servicios split exists; both halves get the role; a shared label ("En proceso") filters both kinds while a single-entity one ("En camino") skips the other fetch entirely; filtered-empty reads differently from actually-empty; each row opens its own dialog; one failed half shows the list plus a warning, both failed shows the retry |
| `transactions/__tests__/OrdersFeedRequests.test.tsx` | the whole action matrix, through the merged page: seller quotes `PRICED` with pesos→cents and is refused a blank/zero price; seller has **no** actions from `PRICED`; seller starts from `ACCEPTED`; buyer accepts, turns a quote down (price clears from the server echo), and cannot start work; either party completes from `SERVING`; terminal rows offer nothing |
| `lib/__tests__/format.test.ts` (new) | `formatItemPrice`: service+0 → `Precio a convenir`; service+1999 → `$19.99`; product+0 → `$0.00`; missing `type`+0 → `$0.00` |

The last case is the one that pins the "missing type = product" rule from the feature spec.

**Verification note:** `npm run build` and `npm run lint` already fail on `main` from unrelated
stale cart/map tests. Gate this work on `npm test` (green today) and on the new suites, and do not
let the pre-existing failures be read as a regression from this change.

---

## 7. Back to backend — answers and asks

**Settled** (the handoff has since confirmed all three, matching what this blueprint proposed):
buyer may cancel from both `REQUESTED` and `SERVING`; either party may complete; and *when the price
is agreed* is deliberately deferred — so no quoting UI gets built (see §4's transitions table).

Answers to the two questions still open in the handoff's §5:

1. **Status labels.** Client owns the Spanish copy — same as transaction statuses today. Keep the
   API on raw enums. Our mapping is in §4's status table (`SERVING` → "En curso", etc.); if you ever
   do want the API to carry copy, that table is the source to lift.
2. **Empty-price display.** Agreed: **"Precio a convenir"**, one string for both the service item's
   `price: 0` and the request's `finalPrice: null`. It lives in `formatItemPrice()`
   (`src/lib/format.ts`) and the request card reuses it, so the two can't drift apart on screen.

### ✅ Both contract change requests landed

Raised while the Request shape was still cheap to move; both are now in the shipped API:

| Asked for | Shipped as |
|---|---|
| A `PRICE` status so the seller quotes and the buyer accepts | **`PRICED`**, plus a distinct **`ACCEPTED`** step before `SERVING` — better than asked: the seller confirms they are starting, so "accepted" and "in progress" are no longer the same state |
| A `note` on the request, immutable, optional | **`customerNote`**, optional, returned on every read, immutable |

Two deltas from what we proposed, both improvements: re-quoting is **not** a `PRICED → PRICED`
self-transition (the buyer turns the quote down back to `REQUESTED`, which clears the price — one
fewer edge and no ambiguity about which quote is current), and the price is **frozen after
`ACCEPTED`** rather than merely "not overwritten by plain moves".

### Answers to the open questions in the build guide §5

1. **Status labels.** Client owns the Spanish copy, as with transaction statuses — keep the API on
   raw enums. Our seven live in `requests/components/statusMeta.ts`; the badge text is in §4's table
   and each status also carries a role-aware "what happens next" hint (`requestStatusHint`), which
   is the part that actually stops users wondering whose move it is.
2. **Empty-price string.** **"Precio a convenir"**, used for both a service item's `price: 0`
   (`formatItemPrice`) and a request's `finalPrice: null` (`formatRequestPrice`), so the two cannot
   disagree on screen. Once `PRICED`, the request's price is shown and the item price is never
   consulted.
3. **Does the buyer need a reason when turning a quote down?** **Yes, eventually — but don't block
   on it.** Today the seller re-quotes blind, which in practice means guessing lower until something
   sticks. A short optional `rejectionNote` on the `PRICED → REQUESTED` move would fix that, and it
   mirrors `customerNote` exactly. Not urgent: the pair can already talk through the chat button on
   the request. Raise it when the negotiation loop shows up in real usage data.

### Still outstanding

- **`GET /request/all` should return the service's `name` and `imgPath`** (as `GET /transaction/all`
  returns `itemCount`/`totalAmount`). This is now a *live* cost, not a hypothetical: `useRequests`
  does **N+1 `GET /item/{id}` calls** purely to render row titles. It is the single highest-value
  change left on this feature.
- **Add `requestUrl(requestId, role)` to `navigationUrlService`** emitting
  `/transactions?request=<id>&role=<role>`. Blocked behind request notifications,
  which the guide lists as not built — but when those land, this is what they should point at. The
  client lands request notifications on `/transactions` today.
- **An optional `rejectionNote` on `PRICED → REQUESTED`** — see question 3 above.

✅ Resolved: the list wrapper is `{ requests: [...] }` as hoped, `role` is required on `/all`, and
the response is unpaginated newest-first.

---

## 8. Suggested commit order

| # | Commit | Ships value on its own |
|---|---|---|
| 1 | `ItemType` + `isService` + `formatItemPrice` in `lib/`, dedupe the five local `formatPrice` copies | refactor only |
| 2 | Type picker in `ItemFormDialog`; `type` on create; stripped on update; mocks emit services | sellers can publish services |
| 3 | Service rendering across the four list/detail surfaces | buyers see services correctly priced |
| 4 | `ProductDetailDialog` Solicitar + `useServiceRequest` + cart exclusion | the service flow works end to end on the live API |
| 5 | `sections/requests/` types, actions, mocks, status meta, transitions | dark, nothing user-visible |
| 6 | Merged Pedidos feed (`useOrdersFeed`, `OrdersList`, label-based chips) + `RequestDetailDialog` | orders and requests in one list per role |
| 7 | Tests | — |

Commits 1–4 are Phase A and can merge without waiting on the backend. 5–6 are Phase B and are inert
in production until the flag flips.
