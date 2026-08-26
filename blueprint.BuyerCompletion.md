# Blueprint — Buyer-Only Completion (Pedidos, the "last step")

**Status:** plan only. No code in this document is written yet.
**Companion:** `alkachof-api/blueprint.BuyerCompletion.md` (the backend half, and the source of every
rule below). Ships **after** backend phase 1; the API rejects the new transitions until then.

---

## 1. The problem in this repo

`TransactionDetailDialog.tsx` line 66:

```ts
// Seller-only for now; buyer-driven transitions are a separate effort.
const nextStatuses = role === 'seller' ? allowedTransitions(currentStatus, role) : []
```

A buyer opening a product order sees a status badge, the lines, the total, a chat button — and **no
actions at all**. Combined with the backend freeze (a `READY-FOR-PICKUP` order has no outgoing edge
except a pickup-code flow **this client never implemented** — `grep -rn "code" src/sections/transactions`
returns nothing but a comment), a Compras row can never leave the screen under its own power. It just
ages out of `active` into `history` still reading "Listo para recoger".

Service requests are in better shape: `RequestDetailDialog` calls `allowedTransitions(status, role)`
for **both** roles, so a buyer already sees "Marcar completado" on a `SERVING` request. Their gap is
narrower — an `ACCEPTED` request the seller never starts offers the buyer only "Cancelar".

---

## 2. What changes, in one table

| | Before | After |
|---|---|---|
| Buyer actions on a transaction | none (hard-coded) | "Confirmar recepción" from `STARTED`, `PROCESSING`, `READY-FOR-PICKUP`, `EN-ROUTE` |
| Seller marking `DELIVERED` | allowed from `EN-ROUTE` | removed |
| `EN-ROUTE → RETURNED` (buyer) | allowed | removed (status orphaned, badge kept) |
| Pickup confirmation code | never implemented here | endpoints gone server-side; nothing to do |
| Buyer completing a request | `SERVING` only | `ACCEPTED` **and** `SERVING` |
| Seller completing a request | allowed from `SERVING` | removed |

No request or response **shape** changes. `updateTransactionStatus` and `updateRequestStatus` keep
their signatures; only which `(status, role)` pairs the server accepts moves.

---

## 3. Files to change

### 3.1 `src/sections/transactions/components/transitions.ts`

Rewrite the `TRANSITIONS` map to mirror the new backend map exactly:

```ts
const TRANSITIONS = {
  STARTED:            { PROCESSING: ['seller'], REJECTED: ['seller'], DELIVERED: ['buyer'] },
  PROCESSING:         { 'READY-FOR-PICKUP': ['seller'], 'EN-ROUTE': ['seller'], DELIVERED: ['buyer'] },
  'READY-FOR-PICKUP': { DELIVERED: ['buyer'] },
  'EN-ROUTE':         { DELIVERED: ['buyer'] },
}
```

Rewrite the docblock: it currently explains that `READY-FOR-PICKUP` is absent "on purpose" because of
the confirmation-code flow — that is now the opposite of the truth. State instead that completion is
the buyer's confirmation of receipt, available from every non-terminal status, and that `RETURNED`
has no inbound edge pending a real returns flow.

`TRANSITION_ACTION_LABEL`: change `DELIVERED` from `'Marcar entregado'` to **`'Confirmar recepción'`**
— it is now an act of confirmation by the person who received the goods, not a bookkeeping flip by
the seller. Keep the `RETURNED` and `STARTED` entries (the type is a total `Record` over
`TransactionStatus`, and both statuses still exist); they simply become unreachable.

### 3.2 `src/sections/transactions/components/TransactionDetailDialog.tsx`

- **Delete the role gate.** `const nextStatuses = allowedTransitions(currentStatus, role)` — the
  transitions map is already role-aware, which is what makes the extra ternary both redundant and
  wrong.
- The destructive-variant check `next === 'REJECTED' || next === 'RETURNED'` can drop `'RETURNED'`
  (unreachable), or stay — harmless either way. Prefer dropping it so the file does not imply an
  action that cannot happen.
- **Confirming receipt goes behind a confirm dialog** (decided). It is terminal and buyer-driven;
  a mis-tap ends the order with no undo and no seller recourse. See §3.3 for the component.
- The 500-means-stale error copy stays as is; the backend still answers 500 for an invalid transition
  and the meaning ("your list is stale, refresh") is unchanged.

### 3.3 `src/sections/transactions/components/ConfirmReceiptDialog.tsx` (new)

Modeled on `RejectPriceDialog` — read that file first, its comments carry the two constraints that
matter.

**Rendered as a replacement, not a stack.** `TransactionDetailDialog` returns the confirm dialog
early instead of rendering it alongside itself, exactly as the request dialog does with `rejecting`:

```tsx
if (confirming) {
  return (
    <ConfirmReceiptDialog
      pending={pending === 'DELIVERED'}
      onConfirm={() => void changeStatus('DELIVERED')}
      onClose={() => setConfirming(false)}
    />
  )
}
```

Two overlays would double the scrim on a phone, and both `Dialog`s listen for Escape on the window,
so one press would close the pair. Closing brings the detail view back with its state intact.

**Shape:**

| Piece | Value |
|---|---|
| Props | `{ pending: boolean; onConfirm: () => void; onClose: () => void }` |
| `Dialog` | `ariaLabel` / `title` = `"Confirmar recepción"`, `className="max-w-md"` |
| Body | One `text-sm text-muted-foreground` paragraph: that confirming closes the order, tells the seller it arrived, and cannot be undone. |
| Footer | `Button variant="outline"` — "Atrás" (calls `onClose`, `disabled={pending}`) + `ProgressButton` — `TRANSITION_ACTION_LABEL.DELIVERED`, `pendingLabel="Confirmando…"`, `progressLabel="Confirmando la recepción del pedido"` |

**Deliberate differences from `RejectPriceDialog`:** no textarea and no local state — there is
nothing to collect, so the dialog is pure friction and must not pretend otherwise. And the confirm
button is `default`, not `destructive`: receiving your order is the happy path, and the red button
next to "no se puede deshacer" would read as a warning about the purchase rather than about the tap.

**Where `pending` comes from:** the existing `pending` state in `TransactionDetailDialog` already
holds the in-flight status, so `pending === 'DELIVERED'` needs nothing new. `changeStatus` already
handles the error and the `onUpdated` callback — the dialog does not duplicate any of it. On success
`changeStatus` sets `currentStatus`, so also clear `confirming` there (or in a `finally`) or the
confirm dialog stays up over a finished order.

**Requests are unchanged.** `SERVING → COMPLETED` and the new `ACCEPTED → COMPLETED` stay one-tap.
The request flow is a negotiation the buyer has been steering turn by turn — they know where it
stands — whereas a product order arrives with no interaction at all before this tap. Revisit if
support sees accidental completions there.

### 3.4 `src/sections/requests/components/transitions.ts`

- `ACCEPTED`: add `COMPLETED: ['buyer']`.
- `SERVING`: change `COMPLETED: ['buyer', 'seller']` to `COMPLETED: ['buyer']`.
- Update the ASCII diagram and docblock (they currently show "(either party) ▼ COMPLETED").
- `REQUEST_ACTION_LABEL.COMPLETED`: consider `'Confirmar servicio'` over `'Marcar completado'`, to
  match the transaction wording. Either is defensible; pick one and use it in both sections.

### 3.5 `src/sections/requests/components/statusMeta.ts`

`requestStatusHint` is now wrong in two places:

- `SERVING` returns `'El servicio está en proceso. Cualquiera de los dos puede marcarlo como completado.'`
  → must become role-aware: buyer "Cuando termine, confírmalo aquí." / seller "El cliente confirmará
  cuando el servicio termine."
- `ACCEPTED` (seller) says "Inicia cuando estés listo" and (buyer) "El vendedor iniciará el servicio"
  — still true, but the buyer's line should acknowledge they can also confirm directly if the work is
  already done.

### 3.6 `src/sections/transactions/components/statusMeta.ts` and `orderStatusFilter.ts`

**No change required, and that is deliberate.** `STATUS_META` must keep `RETURNED` (legacy rows still
render) and `READY-FOR-PICKUP` (still reachable). The filter chips keep their `RETURNED` entry so a
user can still find an old returned order in `history`; a chip that matches nothing in `active` is
not a bug. Revisit only if the chip row proves too long on a phone.

### 3.7 Mocks (`IS_DEV_STAGE` path)

- `src/mocks/mockTransactionStore.ts` — the dev-stage store must accept the new buyer transitions, or
  the demo build contradicts the real API. Check `mockUpdateTransactionStatus` for any validation
  and, more importantly, check the seeded rows: a seed sitting in `READY-FOR-PICKUP` on the **buyer**
  side is now the most valuable demo row there is (it is the frozen order the feature unfreezes) —
  make sure one exists.
- `src/mocks/mockRequestStore.ts` — same: an `ACCEPTED` buyer-side request should be present.
- `src/mocks/ordersArchive.ts` — `TERMINAL_TRANSACTION_STATUSES` keeps all three entries (`RETURNED`
  stays terminal, D5 in the backend blueprint). No change.

---

## 4. Test map

Existing suites that **must** change:

**`src/sections/transactions/__tests__/TransactionsPage.test.tsx`**
- "lets a seller advance a transaction status from the detail dialog" — keep as is (`STARTED →
  PROCESSING` is still seller-only) but re-check it does not assert the *absence* of buyer buttons.
- **New:** a buyer opening a `READY-FOR-PICKUP` order sees "Confirmar recepción", taps it, then
  taps the confirm dialog's button, and `updateTransactionStatus` is called with `(id, 'DELIVERED')`.
- **New:** the first tap alone calls **nothing** — the confirm dialog is the whole point of §3.3, and
  a test that only drives the happy path would pass with it deleted.
- **New:** "Atrás" in the confirm dialog returns to the detail view with the order untouched.
- **New:** a buyer opening a `STARTED` order also sees it — this is the case that proves an abandoned
  order has an exit.
- **New (regression, guards D1):** a **seller** viewing an `EN-ROUTE` order does **not** see
  "Confirmar recepción".
- **New (regression, guards D5):** no role sees a "Marcar devuelto" button in any status.

**`src/sections/transactions/__tests__/ordersFeedActions.test.ts`** — if it asserts the allowed
action set per status/role, extend it with the buyer rows; it is the cheapest place to pin the whole
new matrix.

**`src/sections/transactions/__tests__/OrdersFeedRequests.test.tsx`** — add buyer `ACCEPTED →
COMPLETED`; change any seller-completes-a-`SERVING`-request case to assert the button is gone.

**`src/sections/transactions/__tests__/orderStatusFilter.test.ts`** and **`OrdersFeedScope.test.tsx`**
— should not need changes (the label-matching and archive rules are untouched). If either breaks,
that is a signal something in §3.6 was changed that should not have been.

New unit coverage for the two `transitions.ts` mirrors is worth adding if it does not exist: a plain
table test over `allowedTransitions(status, role)` for every pair is a handful of lines and is the
one place a drift from the backend map gets caught.

---

## 5. Sequencing and risk

1. Backend phase 1 merges and deploys. **Until it does, every new button 500s** — the API rejects
   `DELIVERED` from `STARTED`/`PROCESSING`/`READY-FOR-PICKUP` and rejects a buyer `ACCEPTED →
   COMPLETED`. Do not ship the UI first.
2. UI changes (§3) + tests (§4).
3. The dev-stage mocks (§3.7) can go in with either step; they gate nothing.

**Risk that matters:** the two `transitions.ts` files are hand-maintained mirrors of a server-side
map, with no build-time link between them. They were already out of step conceptually (the seller-only
ternary in the dialog contradicted the map right next to it). Keep the mirror in one place per
section, keep the table test, and treat a 500 on a status change as "the mirror drifted" until proven
otherwise.

**No user-facing data changes:** orders frozen in `READY-FOR-PICKUP` today start working the moment
this ships, with no migration and no re-checkout. Old `RETURNED` orders keep rendering exactly as
they do now.
