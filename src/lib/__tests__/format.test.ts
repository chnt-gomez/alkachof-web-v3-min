import { describe, it, expect } from 'vitest'
import { formatDistance, formatItemPrice, formatPrice } from '../format'
import { isService } from '../item'

describe('formatPrice', () => {
  it('renders cents as MXN currency', () => {
    expect(formatPrice(45900)).toBe('$459.00')
    expect(formatPrice(0)).toBe('$0.00')
  })
})

describe('formatItemPrice', () => {
  it('reads a zero-priced service as not yet quoted', () => {
    expect(formatItemPrice({ price: 0, type: 'service' })).toBe('Precio a convenir')
  })

  it('shows a priced service as a real amount', () => {
    expect(formatItemPrice({ price: 1999, type: 'service' })).toBe('$19.99')
  })

  it('shows a zero-priced product as free, not as a quote', () => {
    expect(formatItemPrice({ price: 0, type: 'product' })).toBe('$0.00')
  })

  it('treats an item with no type as a product', () => {
    expect(formatItemPrice({ price: 0 })).toBe('$0.00')
  })
})

describe('isService', () => {
  it('is true only for an explicit service', () => {
    expect(isService({ type: 'service' })).toBe(true)
    expect(isService({ type: 'product' })).toBe(false)
    expect(isService({})).toBe(false)
  })

  it('fails safe on an unexpected value', () => {
    expect(isService({ type: 'servicio' as 'service' })).toBe(false)
  })
})

describe('formatDistance', () => {
  // The api rounds to 100 m and uses 0 for "under 50 m" — never "0 m".
  it('reads zero as closer than the rounding can say', () => {
    expect(formatDistance(0)).toBe('a menos de 50 m')
  })

  it('keeps metres under a kilometre', () => {
    expect(formatDistance(900)).toBe('a 900 m')
  })

  it('switches to kilometres with one decimal, then whole ones', () => {
    expect(formatDistance(1100)).toBe('a 1.1 km')
    expect(formatDistance(12000)).toBe('a 12 km')
  })
})
