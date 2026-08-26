# Handover: the "Pedidos" feed is now filtered and paginated

**Status: shipped on both sides.** The API is done, tested and verified end-to-end, and the web
client is now wired to it (see "Implemented in the web client" at the bottom). This doc remains the
contract for the endpoints and the record of the decisions behind them.

---

## Why this changed

The Pedidos screen fills up during testing and never empties, because **nothing is ever deleted**: a
transaction belongs to a buyer *and* a seller, so one party clearing their view would destroy the
other party's record. The fix is a read-time filter, not a delete. Finished and abandoned rows are
*archived* — still in the database, still reachable, just not in the default feed.

## The rule

A row is **archived** (hidden from the active feed) when **either**:

1. **It is finished** — a terminal status:
   | Entity | Terminal statuses |
   |---|---|
   | Transaction (products) | `DELIVERED`, `REJECTED`, `RETURNED` |
   | Request (services) | `COMPLETED`, `REJECTED`, `CANCELED` |
2. **It has gone quiet** — no activity for **5 days**, measured from `dateUpdated`, falling back to
   `dateCreated` when the row has never been updated.

Both conditions apply to buyer and seller alike, and to both entities. A row is archived the moment
*either* is true — so a `PROCESSING` transaction nobody has touched in a week is hidden even though
it never finished, and a `DELIVERED` one is hidden even if it was updated a second ago.

> **Note on the status list you gave us.** `CANCELLED` is a *Request* status (spelled `CANCELED`, one
> L) and `RETURNED` is a *Transaction* status — your list spans both entities, and both render on
> this one page. So the rule was applied to **both**, otherwise the screen would still fill up with
> service requests. If you only wanted transactions, the request half is a clean revert.

## The endpoints

Four, in two matched pairs. **Same response shape, same query parameters** — they differ only in
whether archived rows are included.

| Endpoint | Returns |
|---|---|
| `GET /transaction/all` | Products, **active only** ← the feed |
| `GET /transaction/history` | Products, **everything** |
| `GET /request/all` | Services, **active only** ← the feed |
| `GET /request/history` | Services, **everything** |

All four: `authenticateToken` only. Scoped to the caller by JWT — there is no user id in the URL and
you cannot list someone else's orders.

### Query parameters (identical on all four)

| Param | Required | Notes |
|---|---|---|
| `role` | **yes** | `buyer` or `seller`. Which side of the deal you want. |
| `status` | no | Exact status filter, applied *on top of* the feed filter. |
| `limit` | no | Page size. Default **20**, **max 50** (silently clamped, never an error). |
| `skip` | no | Offset. Default 0. Garbage (`abc`, `-3`) falls back to the default. |

### Response

```jsonc
// GET /transaction/all?role=buyer&limit=20&skip=0
{
  "transactions": [ /* TransactionSummary[] — unchanged shape */ ],
  "total": 4,      // rows matching THIS query, all pages — counted under the same filter
  "limit": 20,
  "skip": 0
}
```

```jsonc
// GET /request/all?role=buyer  — NEW envelope, see "what breaks" below
{
  "requests": [ /* Request[] — unchanged shape */ ],
  "total": 2,
  "limit": 20,
  "skip": 0
}
```

### How to page

`total` is the count **under the same filter as the page**, so it is always consistent with what you
can actually reach — the active feed's `total` counts active rows only.

```ts
const hasMore = skip + limit < total          // there is another page
const nextSkip = skip + limit
const pageCount = Math.ceil(total / limit)
```

There is no `hasMore` field and no cursor; compute it from the three numbers. Sort is `dateCreated`
descending with `_id` as a tiebreaker, so **pages never overlap and never skip a row** even when
several rows share a millisecond (verified: 9 rows at `limit=4` returned 4 + 4 + 1 = 9 unique ids).
Paging past the end returns `[]` with the real `total`, not an error.

---

## What breaks in the current client

Two behaviour changes land on endpoints the deployed UI already calls:

1. **`/transaction/all` returns fewer rows.** Same shape, same paging — the finished and stale ones
   are simply gone. Nothing to fix; this is the feature. Completed orders now need `/transaction/history`.
2. **`/request/all` changed shape and is now paginated.** It used to return every request as
   `{ requests: [...] }` with no paging. It now returns `{ requests, total, limit, skip }` and **only
   the first 20**. Existing readers of `data.requests` keep working; anything assuming the array was
   complete is now wrong. This is the one real migration.

---

## Suggested UI

Not prescriptive — your instructions govern. But the API is shaped for:

- **The feed** = `/all` for both entities, merged as today. That is your default view, and it now
  stays short on its own.
- **An "Historial" / "Ver todo" affordance** = the same query against `/history`, paged with the
  formula above. This is the *only* way to reach an archived order, so there should be a way in — a
  user who wants last month's delivered order has nowhere else to look.
- Both feeds page identically, so a single pager component can drive them; keep their `skip` values
  independent (the two collections have different totals).

---

## Sharp edges

- **A row can un-archive.** Staleness is computed at read time, so any status change makes a row
  fresh again and it reappears in the feed. Nothing is permanent or one-way.
- **The 5-day window is measured from last activity, not creation.** An order created two months ago
  but updated yesterday is *active*.
- **Asking the active feed for a terminal status returns nothing.** `/transaction/all?status=DELIVERED`
  → `{ transactions: [], total: 0 }`, deliberately — a contradiction returns empty rather than leaking
  the archived row. Use `/history` with the same `status` to get it (verified: returns the row).
- **`/all` is now a misnomer** — it does *not* return everything. Renaming it to `/feed` would need a
  client change, so it kept its name; treat "all" as "the feed" and "history" as "everything".
- **Invalid `role` answers inconsistently between the two entities**: transactions → **500**,
  requests → **400**. Pre-existing (`/transaction/all` has always done this) and left alone so each
  endpoint matches its sibling. Send a valid role and it never comes up; don't build error handling
  that assumes one status.
- **No index was added.** `buyerId`/`sellerId` are indexed and the alpha dataset is small, so the
  filter rides the existing index. If the Pedidos query ever shows up slow, a compound
  `{ buyerId: 1, dateCreated: -1 }` is the first thing to try.

## One decision to confirm

You asked for "a new endpoint with /all flag so we can properly paginate". `/{entity}/all` was
already taken by the existing paginated listing, so the full-history endpoint is **`/{entity}/history`**
and `/all` became the filtered feed (matching "the current controller and services returns the
filtered transactions"). If you would rather it were a flag on the existing route —
`/transaction/all?includeArchived=true` — that is a one-line change in each controller; the service
already takes `includeArchived` as its parameter.

## Where it lives (API side)

| Layer | File |
|---|---|
| The rule, in one place | `api/util/orderFeedQuery.js` — `staleCutoff`, `activeOnlyFragment` |
| Constants | `CONSTANTS.ORDERS.STALE_AFTER_DAYS` (5, shared), `TRANSACTION.TERMINAL_STATUS`, `REQUEST.TERMINAL_STATUS` |
| Queries | `transactionRepository.buildQuery`, `requestRepository.buildQuery` (+ new `findPage*`/`count*` for requests) |
| Services | `transactionService.listTransactions`, `requestService.listRequests` — both take `includeArchived` |
| Controllers | `listTransactions` / `listTransactionHistory`, `listRequests` / `listRequestHistory` |
| Routes | `/transaction/history`, `/request/history` — registered before `/:id` |

Swagger at `/api-docs` documents all four (dev only). The filter is applied **in the Mongo query**,
never after the fetch — that is what keeps `total` honest and pages full.

---

## Implemented in the web client

| Concern | Where |
|---|---|
| `OrdersScope` (`'active' \| 'history'`) | `src/sections/transactions/types.ts` |
| Endpoint selection | `fetchTransactions` / `fetchRequests` — `scope` picks `/all` vs `/history` |
| Page envelope for services | `RequestListResult` in `actions/fetchRequests.ts` |
| Paging both halves | `useRequests` gained accumulate/`loadMore`/`hasMore`, mirroring `useTransactions` |
| One scope for the whole feed | `useOrdersFeed` — both halves switch together |
| Toggle + empty state | `ScopeToggle` / `EmptyState` in `TransactionsPage.tsx` |
| Dev-stage parity | `src/mocks/ordersArchive.ts` mirrors `api/util/orderFeedQuery.js` |

Three things worth knowing about how it was wired:

- **"Cargar más" asks only the halves that still have rows.** Asking an exhausted half would refetch
  its last page and duplicate rows in the merged list.
- **Appends are deduped by id** (`appendNew` in both hooks). Skip-based paging over a dataset where a
  row can un-archive mid-session shifts the window, so the server can legitimately return a row the
  client already holds; without the guard React renders it twice under a duplicate key.
- **The empty active list is worded "no tienes … activas"**, not the history's absolute "aún no has
  recibido …". A user whose orders are all archived still has orders, so the absolute phrasing would
  be false — and that list is exactly where it would be shown.

The client never applies the archive rule itself; the server owns it. `src/mocks/ordersArchive.ts` is
the sole exception, so the mocked dev stage behaves like production — **keep it in step with
`api/util/orderFeedQuery.js`**.
