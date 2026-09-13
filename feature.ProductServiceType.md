# Product / Service new Item Type.
We currently work with Items from the database but we have added a new feature. Items will now have type to better classify the type of an item: Products and services.

## New requirements

 - Product-Type items remains as they currently are. If an Item has the type missing from the Backend, it should be consider a Product type.
 - The NewProduct modal should be updated. It should allow the users to choose bewteen a Product Type and a Service Type. Use the API to correctly send the item type to the backend with this new UI feature.
 - Service Type products cannot be added to the shopping cart. When browising service type Items, the "Amount" selector should be removed and the "Add to cart" should be replaced for a "Solicitar" button. Wire this button accordingly to the new API specs.
 - New Service type modal should fallback to price 0 by default. The tooltipe should avice the user that it's better if both the buyer and the seller convey on a price for the service rather than adding a fixed price.
 - Notifications and navigation should behave as the product type current implementation
 - See the new status fields and use them accordingly in the Ventas Compras screen.

 # Service Items & Requests — Frontend Build Guide

Everything the web client needs to build the **service** experience. The whole API surface described
here is **live and verified** against a running server.

Spec: `feature.ProductServiceType.md` · Design & decision log: `blueprint.ProductServiceType.md` ·
Machine-readable contract: **`/api-docs`** (non-prod) → tags **Items**, **Cart**, **Requests**.

---

## 1. The one idea

An item used to be one thing: a product with a fixed price, bought through the cart. It can now also
be a **service** — no stock, and **no price until the seller quotes it for that specific job**
(a haircut, a repair, a delivery).

```
PRODUCT   item.type = "product"    cart → checkout → Transaction        price fixed up front
SERVICE   item.type = "service"    /request/create → quote → accept → Request    price agreed per job
```

The two never mix: **a service cannot enter a cart or a checkout** (the server refuses with 400), and
**a product cannot be requested** (also 400). One field, `item.type`, decides which path an item takes.

What you build, in short:
1. A **type picker** on the item create form (§2).
2. A **"Solicitar" CTA** instead of "Agregar al carrito" on service cards (§3).
3. A **request inbox for sellers** and a **request list for buyers**, both driven by the action
   matrix in §5.

---

## 2. Items — the `type` field

### Reading

`type` is on every item from every endpoint (`GET /item/{itemId}`, `GET /catalog/{catalogId}/items`,
both public):

```json
{
  "_id": "64a1b2c3d4e5f6a7b8c9d0e1",
  "name": "Corte de cabello",
  "description": "Incluye lavado",
  "price": 0,
  "type": "service",
  "outOfStock": false,
  "imgPath": "https://cdn.example.com/img/corte.jpg",
  "updatedOn": "2026-08-19T10:00:00.000Z",
  "catalogId": "64a1b2c3d4e5f6a7b8c9d0e2"
}
```

**Every item has a `type`, including ones created before this feature** — no missing-field defence
and no migration wait needed. (Verified against an item whose stored document genuinely has no `type`:
the API still returns `"product"`.) Prefer `type === 'service'` over `type !== 'product'` in your own
checks — it fails safe.

### Creating

Same endpoints as before, one new **optional** field:

| Endpoint | Body | Auth |
|---|---|---|
| `POST /catalog/{catalogId}/item/add` | `multipart/form-data` (with `image`) | Bearer + catalog owner |
| `POST /catalog/{catalogId}/new` | `application/json` (no image) | Bearer + catalog owner |

```json
{ "name": "Corte de cabello", "description": "Incluye lavado", "type": "service" }
```

Omit `type` and you get `"product"`, so existing create calls are unaffected. Only `"product"` and
`"service"` (lowercase) are accepted — anything else is a 400.

### Updating — the type is permanent

`POST /item/{itemId}/update`. Sending a **different** `type` → **400**. Sending the **same** type, or
omitting it, is fine — so an edit form that PATCHes the whole object back just works.

> There is no "convert to service". Put the type picker on the **create** form only; on the edit form
> show it read-only (with a tooltip) or hide it. Don't render a control that can only ever fail.

### ⚠️ The price gotcha for services

`price` is never unset in storage: an item created without one stores `price: 0`. So on a service,
**`price: 0` means "no price yet — quote on request"**, not "$0.00". Render it as such.

If a seller *does* put a price on a service, treat it as a **starting/list price**. The amount
actually charged is the request's `finalPrice`, agreed per job (§4). All money is in **cents**
(`1999` = `$19.99`).

---

## 3. Cart & checkout refuse services

| Call | Result |
|---|---|
| `POST /cart/add` with a service | **400** `Service items cannot be added to a cart` |
| `POST /cart/checkout` with a service line | **400** `Service items cannot be purchased through checkout` + `itemId` |
| `POST /transaction/checkout` with a service line | same 400 |
| `POST /cart/{cartId}/checkout` where the stored cart holds a service | same 400 |
| product-only checkout | **201** — unchanged |

**A mixed cart fails atomically**: product + service → 400 and **zero purchases created**, so nothing
is charged and the user can fix the cart and retry. The error carries `itemId` so you can highlight
the offending line instead of showing a generic banner.

**The UI is the primary defence** — the cart lives in localStorage, so:
- render **"Solicitar / Agendar"** instead of "Agregar al carrito" when `type === 'service'`;
- **purge services from carts users already hold** from before this shipped, or they'll hit a 400 at
  checkout with no idea why.

---

## 4. Requests — the service booking

One buyer, one seller, exactly **one** service item. No purchases involved.

| Method | Path | Auth | Body | Success |
|---|---|---|---|---|
| `POST` | `/request/create` | Bearer | `{ serviceId, customerNote? }` | 201 `{ message, request }` |
| `GET` | `/request/all?role=buyer\|seller&status=` | Bearer | — | 200 `{ requests: [...] }` |
| `GET` | `/request/{requestId}` | Bearer + member | — | 200 `{ request }` |
| `POST` | `/request/{requestId}/status` | Bearer + member | `{ status, finalPrice? }` | 200 `{ message, request }` |

```json
{
  "id": "64a1b2c3d4e5f6a7b8c9d0f9",
  "serviceId": "64a1b2c3d4e5f6a7b8c9d0e1",
  "buyerId": "64a1b2c3d4e5f6a7b8c9d0a1",
  "sellerId": "64a1b2c3d4e5f6a7b8c9d0a2",
  "catalogId": "64a1b2c3d4e5f6a7b8c9d0e2",
  "customerNote": "Dos niños, sábado por la mañana",
  "status": "REQUESTED",
  "finalPrice": null,
  "dateCreated": "2026-08-19T10:00:00.000Z",
  "dateUpdated": null
}
```

Notes that affect the UI:

- **Create takes only `serviceId`** (+ optional note). Seller and catalog are resolved server-side
  from the item; a `buyerId` in the body is ignored — the buyer is always the token's user.
- **`role` is required on `/all`** and picks which side of the relationship you're listing. Results
  are scoped to the caller, newest first, **not paginated**.
- **No find-or-create**: posting `/request/create` twice makes two requests. That's intentional
  (booking the same haircut monthly is normal) — add double-submit protection in the UI.
- **`customerNote`** is optional free text captured at creation, returned on every read, defaults to
  `""`, and **cannot be edited afterwards**. It is the seller's only context for pricing — show it
  prominently on their pricing screen.

### The lifecycle

```
REQUESTED ──(seller quotes)──> PRICED ──(buyer accepts)──> ACCEPTED ──(seller starts)──> SERVING
    ▲                            │                                                         │
    │                            │ buyer turns it down                        either party │
    └────────────────────────────┘  finalPrice → null                                      ▼
    │                                                                                 COMPLETED
    ├──(seller)──> REJECTED
    └──(buyer, from any non-terminal status)──> CANCELED
```

`REJECTED`, `COMPLETED`, `CANCELED` are terminal. Spelling is **`CANCELED`** (one `L`).

### Pricing rules

- The seller quotes by moving to `PRICED` with `{ "status": "PRICED", "finalPrice": 5000 }`.
  `finalPrice` is **required** there and must be a **positive integer in cents**.
- **Only the buyer can accept.** A seller accepting their own quote → 400. That's the entire point of
  the step: never render an accept button for a seller.
- **Turning a quote down** = moving it back with `{ "status": "REQUESTED" }`. `finalPrice` is
  **cleared to `null`** and the request returns to the seller's queue for a fresh quote. Unlimited
  rounds.
- **After `ACCEPTED` the price is frozen** — no transition leads back to `PRICED`. A `finalPrice` sent
  on any later transition is **silently ignored**: you get a 200 but the price does not change, so
  don't treat a 200 as "my price was applied".
- **No counter-offers and no quote history.** A rejected price is simply gone; the buyer cannot
  propose a number.

---

## 5. The action matrix — build your buttons from this

This is the whole permission model. Both parties see the request; who may act depends on the status.

| Status | Buyer can | Seller can | Waiting on | Suggested label |
|---|---|---|---|---|
| `REQUESTED` | Cancel | **Quote** (`PRICED` + price) · Reject | **Seller** | "Esperando cotización" |
| `PRICED` | **Accept** · **Turn down** (→ `REQUESTED`) · Cancel | — | **Buyer** | "Cotizado — revisa el precio" |
| `ACCEPTED` | Cancel | **Start** (`SERVING`) | **Seller** | "Aceptado — por iniciar" |
| `SERVING` | **Complete** · Cancel | **Complete** | Either | "En proceso" |
| `REJECTED` | — | — | — | "Rechazado por el vendedor" |
| `COMPLETED` | — | — | — | "Completado" |
| `CANCELED` | — | — | — | "Cancelado" |

Read it as: *for this status and this role, these are the only status values the API will accept.*
Anything else returns 400 `Invalid status transition`.

Because that one message covers both "illegal from this status" and "not your role", **drive the UI
from status + role using this table** rather than parsing error text — then a 400 only ever means a
stale screen, and the fix is to refetch.

### Screens this implies

**Buyer**
- *Service detail* → "Solicitar" opens a form with the optional note → `POST /request/create`.
- *Mis solicitudes* → `GET /request/all?role=buyer`. Badge the `PRICED` ones — those are the only
  ones needing the buyer's attention. Show price + accept/turn-down.

**Seller**
- *Solicitudes recibidas* → `GET /request/all?role=seller`. Badge `REQUESTED` — the pricing queue.
- *Pricing screen* → shows `customerNote` prominently + a cents price input → `PRICED`.
- `ACCEPTED` items get a "Iniciar" action; `SERVING` items a "Completar".

There is **no push notification and no polling helper** for requests yet (§7), so refetch the list on
screen focus if you want it to feel live.

---

## 6. Errors

| Status | When | Message |
|---|---|---|
| `400` | `serviceId` missing | `serviceId is required` |
| `400` | The item is a product | `Requests can only be created for service items` |
| `400` | Seller requesting their own service | `You cannot request your own service` |
| `400` | Move not allowed for this status **or** this role | `Invalid status transition` |
| `400` | Moving to `PRICED` without a price | `finalPrice is required to price a request` |
| `400` | Price zero, negative, fractional or not a number | `finalPrice must be a positive integer in cents` |
| `400` | `role` missing/invalid on `/all` | `Request role must be buyer or seller` |
| `401` | No/expired token, or user not `active` | `Auth failed` |
| `403` | Caller is neither buyer nor seller | `Unauthorized` |
| `403` | **Malformed** id in the path | `Invalid Request ID` |
| `404` | Unknown `serviceId` or unknown request | `Service not found` / `Request not found` |

Item/cart errors: `400` unknown item type · `400` type change on update · `400` service in
cart/checkout · `403` not the owner (or the 25-item cap on create).

**A malformed id gives 403, not 404.** The ownership middleware runs before the handler and can't tell
"badly formed" from "not yours", so it fails closed — same as the existing transaction and location
endpoints. Treat 403 as "no access" generally.

---

## 7. Not built — don't design around these

- **Notifications / live push on request events.** Nothing fires today; the buyer and seller only see
  changes when they refetch. (Requests do *not* ride the `/live` socket.)
- **Pagination on `/request/all`** — full list, newest first.
- **Scheduling, calendar slots, durations** — no date fields beyond the timestamps.
- **Counter-offers, quote history, a reason when turning a quote down.**
- **Editing `customerNote`** after creation, and any seller withdrawal after quoting (the seller can
  only reject from `REQUESTED`; the buyer can cancel any time before terminal).
- **Filtering catalog items by type server-side** — `GET /catalog/{id}/items` returns both; filter
  client-side.

### Open questions for you

1. **Status labels.** The API returns raw enums; Spanish copy is the client's to own (as with
   transaction statuses). There are **seven** statuses now — the table in §5 has suggested wording,
   tell us if you'd rather the API carry it.
2. **Empty-price string.** A service item's `price: 0` and a request's `finalPrice: null` both mean
   "no price yet" — agree on one string ("a convenir" / "por cotizar") so they never disagree on
   screen. Once `PRICED`, show `finalPrice`, never the item price.
3. **Does the buyer need a reason when turning a quote down?** Today the seller re-quotes blind. Small
   schema addition if the UX wants it — ask before building around its absence.

---

## 8. Try it locally

Swagger UI (non-prod): **`/api-docs`**. Or curl — the full happy path, including a rejected quote:

```bash
tok() { curl -s -X POST http://localhost:3001/login -H "Content-Type: application/json" \
  -d "{\"email\":\"$1\",\"password\":\"…\"}" | jq -r .token; }
SELLER=$(tok seller@example.com); BUYER=$(tok buyer@example.com)

# seller publishes a service (no price — it's quoted per job)
curl -s -X POST http://localhost:3001/catalog/<catalogId>/new \
  -H "Authorization: Bearer $SELLER" -H "Content-Type: application/json" \
  -d '{"name":"Corte a domicilio","type":"service"}'

# a service cannot be carted or checked out
curl -s -X POST http://localhost:3001/cart/add -H "Authorization: Bearer $BUYER" \
  -H "Content-Type: application/json" -d '{"itemId":"<serviceId>","quantity":1}'      # 400

# buyer books it, with a brief for the seller
curl -s -X POST http://localhost:3001/request/create -H "Authorization: Bearer $BUYER" \
  -H "Content-Type: application/json" \
  -d '{"serviceId":"<serviceId>","customerNote":"Dos niños, sábado por la mañana"}'   # 201

# each side lists their own
curl -s "http://localhost:3001/request/all?role=seller" -H "Authorization: Bearer $SELLER"
curl -s "http://localhost:3001/request/all?role=buyer"  -H "Authorization: Bearer $BUYER"

status() { curl -s -X POST "http://localhost:3001/request/$1/status" \
  -H "Authorization: Bearer $2" -H "Content-Type: application/json" -d "$3"; }

status <requestId> "$SELLER" '{"status":"PRICED","finalPrice":5000}'   # quote $50.00
status <requestId> "$BUYER"  '{"status":"REQUESTED"}'                  # turned down → finalPrice null
status <requestId> "$SELLER" '{"status":"PRICED","finalPrice":4000}'   # re-quote $40.00
status <requestId> "$BUYER"  '{"status":"ACCEPTED"}'                   # only the buyer can
status <requestId> "$SELLER" '{"status":"SERVING"}'                    # work starts
status <requestId> "$BUYER"  '{"status":"COMPLETED"}'                  # either party
```

---

## 9. Verification

Every response shape and status code above was produced by a real server (ephemeral MongoDB; seeded
seller, buyer and an unrelated third user), not written from the source.

Confirmed — **items:** service create, product default, reads, 400 on type change, 200-level on an
unchanged/omitted type, 400 on an unknown type, legacy item reading as `product`. **Cart/checkout:**
400 on cart-add of a service, unchanged 201 for products and legacy items, 400 with **zero purchase
rows written** on a mixed checkout, 400 on a stored cart holding a service, product-only checkout
still 201 with its transaction. **Requests:** create with and without a note, both list roles, member
read, 400 for a product/self-request/missing `serviceId`, 404 unknown service, 403 for a third user
and for a malformed id, 401 without a token, empty list for the third user. **Negotiation:** the full
`REQUESTED → PRICED → (turned down) → REQUESTED → PRICED → ACCEPTED → SERVING → COMPLETED` loop, plus
400 when the buyer tries to price, 400 pricing without/with an invalid price, 400 when the seller
tries to accept their own quote, `finalPrice` cleared on rejection, and the accepted price surviving
a later transition that tried to overwrite it. **Swagger:** all four `/request` paths served under the
**Requests** tag with the seven-status enum.

Contract change requests → raise them against `blueprint.ProductServiceType.md`.
