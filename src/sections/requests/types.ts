/**
 * A Request is to a service what a Transaction is to a product: one buyer, one
 * seller, one service item, and a status that moves as the job progresses.
 *
 * Note this section has no page of its own (no `RequestsPage.tsx`), which
 * departs from the sections pattern in CLAUDE.md. Requests are rendered inside
 * the existing "Pedidos" screen (`TransactionsPage`) under a Productos /
 * Servicios toggle, because the feature spec asks for them in Ventas/Compras.
 */

/**
 * The seven states of a booking:
 *
 *   REQUESTED ─(seller quotes)→ PRICED ─(buyer accepts)→ ACCEPTED ─(seller starts)→ SERVING
 *       ▲                          │                                                  │
 *       └──(buyer turns it down)───┘                            (either party)        ▼
 *                                                                              COMPLETED
 *
 * `REJECTED`, `COMPLETED` and `CANCELED` are terminal. Note the spelling is
 * `CANCELED`, one `L`.
 */
export type RequestStatus =
  | 'REQUESTED'
  | 'PRICED'
  | 'ACCEPTED'
  | 'SERVING'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELED'

/** Which side of a request the current user is on. */
export type RequestRole = 'buyer' | 'seller'

/**
 * Cap on `customerNote`, applied wherever it is written — the buyer's brief at
 * creation and their restatement when turning a quote down. Keeps the note to
 * something a seller will actually read on a phone. Client-side only; the API
 * accepts any string.
 */
export const NOTE_MAX_LENGTH = 500

/**
 * Named `ServiceRequest`, not `Request` — `Request` is a DOM global, and
 * shadowing it in files that also touch `fetch` is a trap.
 */
export type ServiceRequest = {
  id: string
  serviceId: string
  buyerId: string
  sellerId: string
  catalogId: string
  status: RequestStatus
  /**
   * Quoted price in cents. `null` until the seller quotes, and reset to `null`
   * when the buyer turns a quote down. Frozen once `ACCEPTED` — the API
   * silently ignores a `finalPrice` sent on any later transition, so never read
   * a 200 as "my price was applied".
   */
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

/**
 * A request enriched for display with the service's name and image, plus the
 * other party's display name. The draft contract carries none of these, so the
 * client resolves them — the service from `GET /item/{id}` and the person from
 * `GET /profile/summaries`. See `useRequests`.
 */
export type ServiceRequestRow = ServiceRequest & {
  serviceName: string
  serviceImgPath: string
  /**
   * The person on the *other* side of the request: the seller on Compras, the
   * buyer on Ventas — never the current user, who already knows who they are.
   * Falls back to a generic label when the lookup misses.
   */
  counterpartyAlias: string
}
