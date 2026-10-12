import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  api: vi.fn(),
}))

import { api, ApiError } from '@/lib/api'
import { lookupNearbyCatalogs } from '../actions/lookupNearbyCatalogs'

const page = {
  results: [
    {
      catalogId: 'c1',
      alias: 'Pan de Ana',
      lat: 19.433,
      lng: -99.133,
      city: 'Ciudad de México',
      neighborhood: 'Centro',
      distanceMeters: 1100,
    },
  ],
  total: 2,
  truncated: false,
  limit: 200,
  skip: 0,
  radiusMeters: 7000,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api).mockResolvedValue(page)
})

describe('lookupNearbyCatalogs', () => {
  it('asks for the point and nothing else', async () => {
    await lookupNearbyCatalogs({ lat: 19.432608, lng: -99.133209 })

    const [path, options] = vi.mocked(api).mock.calls[0]
    const url = new URL(path, 'https://api.test')
    expect(url.pathname).toBe('/location/lookup')
    expect(url.searchParams.get('lat')).toBe('19.432608')
    expect(url.searchParams.get('lng')).toBe('-99.133209')
    // The server's defaults *are* the contract: sending radius/limit would mean
    // a server-side change needs a client release.
    expect(url.searchParams.get('radius')).toBeNull()
    expect(url.searchParams.get('limit')).toBeNull()
    // Public endpoint — a buyer browsing the map may not be logged in.
    expect(options?.authenticated).toBe(false)
  })

  it('keeps the radius the server echoed, not its own copy', async () => {
    vi.mocked(api).mockResolvedValue({ ...page, radiusMeters: 12000 })

    const result = await lookupNearbyCatalogs({ lat: 19.43, lng: -99.13 })

    expect(result).toMatchObject({ ok: true, radiusMeters: 12000 })
  })

  it('refuses an impossible point without spending a call', async () => {
    const result = await lookupNearbyCatalogs({ lat: 999, lng: -99.13 })

    // A 400 counts against the API's 6-per-minute budget.
    expect(api).not.toHaveBeenCalled()
    expect(result).toMatchObject({ ok: false, reason: 'error' })
  })

  it('reads a 404 as the feature being switched off', async () => {
    vi.mocked(api).mockRejectedValue(new ApiError('Not found', 404))

    expect(await lookupNearbyCatalogs({ lat: 19.43, lng: -99.13 })).toEqual({
      ok: false,
      reason: 'unavailable',
    })
  })

  it('carries the resume time out of a 429', async () => {
    vi.mocked(api).mockRejectedValue(
      new ApiError('Too many requests', 429, { availableAt: '2026-10-11T00:13:47.957Z' }),
    )

    expect(await lookupNearbyCatalogs({ lat: 19.43, lng: -99.13 })).toEqual({
      ok: false,
      reason: 'rateLimited',
      availableAt: '2026-10-11T00:13:47.957Z',
    })
  })

  it('treats an empty circle as a valid answer', async () => {
    vi.mocked(api).mockResolvedValue({ ...page, results: [], total: 0 })

    expect(await lookupNearbyCatalogs({ lat: 19.43, lng: -99.13 })).toMatchObject({
      ok: true,
      results: [],
    })
  })
})
