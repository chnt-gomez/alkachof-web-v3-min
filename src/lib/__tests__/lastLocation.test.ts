import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearLastLocation, readLastLocation, saveLastLocation } from '../lastLocation'
import { readCookie } from '../cookies'

const COOKIE = 'alk.lastLoc'

/** Writes a raw value, bypassing `saveLastLocation`'s rounding and validation. */
function setRaw(value: string) {
  document.cookie = `${COOKIE}=${encodeURIComponent(value)}; path=/; SameSite=Strict`
}

beforeEach(() => clearLastLocation())
afterEach(() => clearLastLocation())

describe('saveLastLocation', () => {
  it('round-trips a position', () => {
    saveLastLocation({ lat: 17.07, lng: -96.72 })

    expect(readLastLocation()).toEqual({ lat: 17.07, lng: -96.72 })
  })

  it('stores a coarse position, because the cookie lands in the server log', () => {
    saveLastLocation({ lat: 20.6666666, lng: -103.3333333 })

    // Three decimals, ~110 m — invisible at the opening zoom.
    expect(readCookie(COOKIE)).toBe('20.667,-103.333')
  })

  it('does not throw when the cookie cannot be written', async () => {
    vi.resetModules()
    vi.doMock('../cookies', async (importOriginal) => ({
      ...(await importOriginal<typeof import('../cookies')>()),
      writeCookie: () => {
        throw new Error('cookies disabled')
      },
    }))
    const { saveLastLocation: save } = await import('../lastLocation')

    expect(() => save({ lat: 1, lng: 2 })).not.toThrow()

    vi.doUnmock('../cookies')
    vi.resetModules()
  })
})

describe('readLastLocation', () => {
  it('reads nothing when no hint was ever stored', () => {
    expect(readLastLocation()).toBeNull()
  })

  // A hand-edited or truncated cookie must read as "no hint": flying to NaN
  // throws inside Leaflet and would take the whole screen down.
  it.each([
    ['not coordinates at all', 'hola'],
    ['a single number', '17.07'],
    ['an empty half', '17.07,'],
    ['a third value', '17.07,-96.72,13'],
    ['an impossible latitude', '140,-96.72'],
    ['an impossible longitude', '17.07,-500'],
  ])('rejects %s', (_label, raw) => {
    setRaw(raw)

    expect(readLastLocation()).toBeNull()
  })
})

describe('clearLastLocation', () => {
  it('forgets the hint', () => {
    saveLastLocation({ lat: 17.07, lng: -96.72 })

    clearLastLocation()

    expect(readLastLocation()).toBeNull()
  })
})
