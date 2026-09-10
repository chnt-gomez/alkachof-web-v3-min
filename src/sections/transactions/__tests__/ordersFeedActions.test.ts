import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api')

import { api } from '@/lib/api'
import { fetchTransactions } from '../actions/fetchTransactions'
import { fetchRequests } from '@/sections/requests/actions/fetchRequests'

/** The path the action asked for, split into route and query. */
function calledUrl(): URL {
  const path = vi.mocked(api).mock.calls[0][0]
  return new URL(path, 'https://api.test')
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api).mockResolvedValue({ transactions: [], requests: [], total: 0, limit: 20, skip: 0 })
})

describe('fetchTransactions', () => {
  it('reads the active feed by default', async () => {
    await fetchTransactions({ role: 'buyer' })
    expect(calledUrl().pathname).toBe('/transaction/all')
  })

  it('reads the history endpoint when asked for the full set', async () => {
    await fetchTransactions({ role: 'buyer', scope: 'history' })
    expect(calledUrl().pathname).toBe('/transaction/history')
  })

  it('sends role, paging and an optional status', async () => {
    await fetchTransactions({ role: 'seller', status: 'EN-ROUTE', limit: 50, skip: 40 })
    const { searchParams } = calledUrl()
    expect(searchParams.get('role')).toBe('seller')
    expect(searchParams.get('status')).toBe('EN-ROUTE')
    expect(searchParams.get('limit')).toBe('50')
    expect(searchParams.get('skip')).toBe('40')
  })

  it('omits status when there is no filter', async () => {
    await fetchTransactions({ role: 'buyer' })
    expect(calledUrl().searchParams.has('status')).toBe(false)
  })
})

describe('fetchRequests', () => {
  it('reads the active feed by default', async () => {
    await fetchRequests({ role: 'buyer' })
    expect(calledUrl().pathname).toBe('/request/all')
  })

  it('reads the history endpoint when asked for the full set', async () => {
    await fetchRequests({ role: 'seller', scope: 'history' })
    expect(calledUrl().pathname).toBe('/request/history')
  })

  // This endpoint was unpaginated until the feed change; sending no paging at
  // all would silently take the server's default page as if it were everything.
  it('always sends explicit paging', async () => {
    await fetchRequests({ role: 'buyer' })
    const { searchParams } = calledUrl()
    expect(searchParams.get('limit')).toBe('20')
    expect(searchParams.get('skip')).toBe('0')
  })

  it('sends role, paging and an optional status', async () => {
    await fetchRequests({ role: 'seller', status: 'PRICED', limit: 50, skip: 20 })
    const { searchParams } = calledUrl()
    expect(searchParams.get('role')).toBe('seller')
    expect(searchParams.get('status')).toBe('PRICED')
    expect(searchParams.get('limit')).toBe('50')
    expect(searchParams.get('skip')).toBe('20')
  })

  it('returns the page envelope the endpoint now sends', async () => {
    vi.mocked(api).mockResolvedValue({ requests: [], total: 7, limit: 20, skip: 0 })
    const result = await fetchRequests({ role: 'buyer' })
    expect(result).toEqual({ requests: [], total: 7, limit: 20, skip: 0 })
  })
})
