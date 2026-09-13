import { describe, it, expect } from 'vitest'
import { formatItemPrice, formatPrice } from '../format'
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
