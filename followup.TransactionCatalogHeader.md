# Follow-up: Transaction "header" (shop name / buyer name) — Frontend Handoff

This document hands the **Ventas / Compras page headers** work to the web client team. It describes
the API changes that let the UI label each transaction row with **who** it involves:

- **Compras (buyer view):** the **shop / catalog name** the order came from.
- **Ventas (seller view):** the **buyer's display name**.

It mirrors the OpenAPI definitions live in Swagger (`/api-docs`, non-prod only) so the UI can be
built against a stable contract.

## Summary

Until now a transaction row (`GET /transaction/all`) only carried a `counterpartyId` — the *other
party's user id* — with no way to render a human-readable header:

- For a **buyer**, `counterpartyId` is the **seller's user id**, which resolves to a *person's*
  name, not the *shop* name the buyer actually recognizes.
- For a **seller**, `counterpartyId` is the **buyer's user id** — that one is fine, we just need the
  alias.

Two changes fix this:

1. **Transactions now carry `catalogId`** — the shop that generated the order. Present on both
   `GET /transaction/{id}` and every row of `GET /transaction/all`.
2. **New batch endpoint `GET /catalog/summaries`** — resolve many `catalogId`s to shop names in one
   call, mirroring the existing `GET /profile/summaries` for user aliases.

No transaction *creation* call changes — checkout is unchanged. This is purely additive read data.

## What each page does

### Compras (role=buyer)
1. `GET /transaction/all?role=buyer&limit&skip` → rows now include **`catalogId`**.
2. Collect the distinct `catalogId`s on the page, call
   `GET /catalog/summaries?catalogIds=<id1,id2,…>` → `{ summaries: [{ catalogId, alias }] }`.
3. Render `alias` as the row header (the shop name). Fall back to a generic label
   (e.g. `"Catálogo"`) when a row has `catalogId: null` (legacy rows — see below) or the id is
   absent from `summaries` (catalog deleted).

### Ventas (role=seller)
1. `GET /transaction/all?role=seller&limit&skip` → each row has **`counterpartyId`** (the buyer's
   user id). *(No transaction change needed for this view — `catalogId` on seller rows is the
   seller's own catalog and can be ignored.)*
2. Collect the distinct `counterpartyId`s, call the **already-shipped**
   `GET /profile/summaries?userIds=<id1,id2,…>` → `{ summaries: [{ userId, alias, profilePictureUrl }] }`.
3. Render `alias` (and optionally `profilePictureUrl`) as the row header. Fall back to a generic
   label when a buyer has no profile / no alias.

Both batch endpoints **omit** ids they can't resolve (deleted/missing), so always key off the
returned array and supply a fallback for the misses — never assume every requested id comes back.

## Base paths & auth

All endpoints require `Authorization: Bearer <jwt>`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/transaction/all?role=buyer\|seller&status&limit&skip` | Paginated transaction rows (now include `catalogId`) |
| `GET` | `/catalog/summaries?catalogIds=<csv>` | Batch shop-name lookup (**new**) |
| `GET` | `/profile/summaries?userIds=<csv>` | Batch user-alias lookup (already shipped) |

## Schemas

### TransactionSummary (a row of `GET /transaction/all`)
```json
{
  "id": "64a1b2c3d4e5f6a7b8c9d0e1",
  "status": "STARTED",
  "dateCreated": "2026-08-17T18:22:10.000Z",
  "dateUpdated": null,
  "purchaseIds": ["64a1b2c3d4e5f6a7b8c9d0a1"],
  "itemCount": 2,
  "totalAmount": 4599,
  "counterpartyId": "64a1b2c3d4e5f6a7b8c9d0b2",
  "catalogId": "64a1b2c3d4e5f6a7b8c9d0c3"
}
```
- **`catalogId`** — *new*. The shop that generated the order. Use it on the **buyer** view to look
  up the shop name. **May be `null`** on transactions created before this feature shipped — render a
  fallback label.
- `counterpartyId` — the *other* party's user id (seller on buyer rows, buyer on seller rows). Use it
  on the **seller** view to look up the buyer's alias.
- `totalAmount` — **cents** (`4599` = `$45.99`). Unchanged.

### CatalogSummary (an item of `GET /catalog/summaries`)
```json
{ "catalogId": "64a1b2c3d4e5f6a7b8c9d0c3", "alias": "La Tiendita MX" }
```
- `alias` — the shop's display name (may be an empty string if the owner never set one — fall back to
  a generic label).

Full response:
```json
{ "summaries": [ { "catalogId": "…", "alias": "…" } ] }
```

### ProfileSummary (an item of `GET /profile/summaries`, unchanged)
```json
{ "userId": "64a1b2c3d4e5f6a7b8c9d0b2", "alias": "artisan_mx", "profilePictureUrl": "https://…" }
```

## Request notes for the batch endpoints

- **`catalogIds` / `userIds` are comma-separated** in the query string:
  `GET /catalog/summaries?catalogIds=aaa,bbb,ccc`.
- **De-duplicate** ids client-side before sending — the header is per *distinct* shop/buyer, not per
  row.
- **Max 100 ids per call.** Extra ids beyond 100 are dropped; page sizes are ≤ 50 so a single page
  never hits the cap, but chunk if you ever batch across pages.
- Invalid or unknown ids are **silently omitted** from `summaries` (never a 4xx/5xx for a bad id).

## Status codes

| Status | When |
|---|---|
| `200` | Success (including an empty `summaries: []`) |
| `401` | Missing/invalid token, or user not `active` |

## Edge cases the UI must handle

- **Legacy transactions** (`catalogId: null`) — orders placed before this feature. Show a generic
  shop label; there is no catalog to resolve. New orders always carry `catalogId`.
- **Deleted catalog / deleted buyer profile** — the id is present on the row but absent from the
  batch response. Show a fallback label.
- **Empty alias** — an owner/user who never set a name returns `alias: ""`. Treat as "no name".

## Open items / not included

- No server-side pre-joined name on the transaction row (deliberate) — the FE resolves names via the
  two batch endpoints. Say the word if you'd rather have `counterpartyName` inlined on the row.
- No `profilePictureUrl` equivalent for catalogs (`CatalogSummary` is `{ catalogId, alias }` only) —
  catalogs have no picture field yet. Ask if the header needs a shop logo.
- Backfilling `catalogId` onto pre-existing transactions is not planned; those stay `null`.
