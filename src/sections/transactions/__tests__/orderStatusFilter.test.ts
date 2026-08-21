import { describe, expect, it } from 'vitest'
import { filterByLabel, ORDER_STATUS_FILTERS } from '../components/orderStatusFilter'

/**
 * The status filter has no UI in this MVP — `TransactionsPage` does not render
 * `StatusFilterChips` — but the label→enum mapping behind it is kept for when it
 * comes back. Tested directly here so it can't rot while it is off screen; the
 * page-level cases that used to cover it went out with the chips.
 */
describe('orderStatusFilter', () => {
  it('maps a shared label onto both enums', () => {
    // "En proceso" is PROCESSING for an order and SERVING for a request, so one
    // chip has to catch both rather than showing two identical words.
    expect(filterByLabel('En proceso')).toMatchObject({
      transaction: 'PROCESSING',
      request: 'SERVING',
    })
    expect(filterByLabel('Rechazado')).toMatchObject({
      transaction: 'REJECTED',
      request: 'REJECTED',
    })
  })

  it('leaves the other side undefined for a single-entity label', () => {
    // The feed reads these as "don't fetch that half at all".
    expect(filterByLabel('En camino')).toMatchObject({ transaction: 'EN-ROUTE' })
    expect(filterByLabel('En camino')?.request).toBeUndefined()

    expect(filterByLabel('Cotizado')).toMatchObject({ request: 'PRICED' })
    expect(filterByLabel('Cotizado')?.transaction).toBeUndefined()
  })

  it('treats no label and an unknown label alike — no filter', () => {
    expect(filterByLabel(null)).toBeNull()
    expect(filterByLabel('Inventado')).toBeNull()
  })

  it('lists every label exactly once, so no chip reads as a duplicate', () => {
    const labels = ORDER_STATUS_FILTERS.map((f) => f.label)
    expect(new Set(labels).size).toBe(labels.length)
  })
})
