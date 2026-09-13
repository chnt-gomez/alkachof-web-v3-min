## Transactions (purchase hand-off flow) PAGE

A **Transaction** tracks the physical hand-off of a purchase from seller to buyer. Every purchase — whether from `/item/{itemId}/purchase` or cart checkout — automatically opens one: `purchaseService.purchaseItem` calls `transactionService.startTransaction`, linking `purchaseId`, `buyerId` and `sellerId`. Do not create transactions anywhere else.

#### Purchase vs Transaction

- **Purchase** (`purchaseSchema`) records *what* was bought: `item`, `buyer`, `seller`, `quantity` (default 1), `totalPrice` (**cents**, totalized as `item.price * quantity` at purchase time), and `discountCode` (**placeholder** — defaults to `null`, discounts are not applied yet). `purchaseService.purchaseItem(userId, itemId, quantity = 1)` is the single entry point; both `itemController` and `cartService.checkout` call it with that signature.
- **Transaction** (`transactionSchema`) records *where the hand-off stands*: `purchaseId`, `buyerId`, `sellerId`, `status`, `dateCreated`, `dateUpdated`. The legacy `purchase.status` field (`new`/`accepted`/…) still exists but the transaction status is the source of truth for the hand-off.

#### State machine

Statuses and roles live in `#constants/constants` (`CONSTANTS.TRANSACTION.STATUS` / `.ROLE`). Transitions are enforced by the `TRANSITIONS` map in `transactionService.updateStatus`, which resolves the caller's role by comparing `userId` against `buyerId`/`sellerId`:

| From | To | Who |
|---|---|---|
| `STARTED` | `PROCESSING` / `REJECTED` | seller |
| `PROCESSING` | `READY-FOR-PICKUP` / `EN-ROUTE` | seller |
| `READY-FOR-PICKUP` | `DELIVERED` | **only** via `confirmDelivery` (code), never via a direct status update |
| `EN-ROUTE` | `DELIVERED` | buyer or seller |
| `EN-ROUTE` | `RETURNED` | buyer |

`REJECTED`, `DELIVERED` and `RETURNED` are terminal — no further updates are accepted.

#### Confirmation code (pickup only)

When a transaction enters `READY-FOR-PICKUP`, `transactionService` generates a code (`cryptoService.generateVerificationToken`) and stores it in a **separate collection** (`transactionConfirmationCodeSchema` + `transactionConfirmationCodeRepository`). The split exists so the code never travels with the transaction document — the seller must never see it.

- **Buyer** reads it: `GET /transaction/{transactionId}/code` (`authorizeTransactionBuyer`), only while status is `READY-FOR-PICKUP`.
- **Seller** submits it: `POST /transaction/{transactionId}/confirm` (`authorizeTransactionSeller`). A matching code moves the transaction to `DELIVERED`.

#### Routes and authorization

Mounted at `/transaction` (`api/routes/transactionRoutes.js`). All endpoints require `authenticateToken`; ownership is enforced by `authorizeTransactionBuyer` / `authorizeTransactionSeller` / `authorizeTransactionMember` (`api/middleware/authorizeTransactionOwner.js`, section F pattern, backed by `authorizeService`). Fetching (`GET /{transactionId}`) and status updates (`POST /{transactionId}/status`) are member-gated; the service layer then decides which role may perform which transition.