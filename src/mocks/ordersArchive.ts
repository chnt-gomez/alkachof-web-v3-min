/**
 * The server's "active feed" rule, reimplemented for the dev stage only.
 *
 * **Mirrors `api/util/orderFeedQuery.js` and `CONSTANTS.ORDERS` in the API —
 * keep the two in step** (same arrangement as `imagePresets.ts` and
 * `CONSTANTS.IMAGE`). Production code never needs this: the real endpoints do
 * the filtering, and the client renders whatever it is handed. It exists so the
 * mocked stage behaves like the real one, instead of showing a feed that never
 * shortens.
 *
 * A row is archived — dropped from the active feed — when it has finished, or
 * when it has sat untouched long enough to count as abandoned.
 */
const STALE_AFTER_DAYS = 5
const DAY_MS = 86_400_000

export const TERMINAL_TRANSACTION_STATUSES = ['DELIVERED', 'REJECTED', 'RETURNED']
export const TERMINAL_REQUEST_STATUSES = ['COMPLETED', 'REJECTED', 'CANCELED']

type ArchivableRow = {
  status: string
  dateCreated: string
  /**
   * Absent on a row nobody has acted on yet — the API's schema has no default
   * here either, which is exactly why freshness falls back to `dateCreated`.
   * Reading only this would treat every brand-new order as infinitely stale.
   */
  dateUpdated?: string | null
}

export function isArchivedOrder(row: ArchivableRow, terminalStatuses: string[]): boolean {
  if (terminalStatuses.includes(row.status)) return true
  const lastActivity = row.dateUpdated ?? row.dateCreated
  return Date.now() - new Date(lastActivity).getTime() > STALE_AFTER_DAYS * DAY_MS
}
