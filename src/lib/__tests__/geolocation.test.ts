import { beforeEach, describe, expect, it, vi } from 'vitest'
import { distanceBetween, geolocationMessage, getDeviceLocation, isValidCoords } from '../geolocation'

const getCurrentPosition = vi.fn()

function setGeolocation(value: unknown) {
  Object.defineProperty(globalThis.navigator, 'geolocation', { value, configurable: true })
}

beforeEach(() => {
  getCurrentPosition.mockReset()
  setGeolocation({ getCurrentPosition })
})

describe('getDeviceLocation', () => {
  it('resolves with the device coordinates', async () => {
    getCurrentPosition.mockImplementation((success: PositionCallback) =>
      success({ coords: { latitude: 20.5, longitude: -100.3 } } as GeolocationPosition),
    )

    await expect(getDeviceLocation()).resolves.toEqual({
      ok: true,
      coords: { lat: 20.5, lng: -100.3 },
    })
  })

  // Never rejects: a caller that has to tell the two failures apart inside a
  // `catch` ends up guessing which one it got.
  it('reports a refused or timed-out request as denied', async () => {
    getCurrentPosition.mockImplementation(
      (_success: PositionCallback, error: PositionErrorCallback) =>
        error({ code: 1 } as GeolocationPositionError),
    )

    await expect(getDeviceLocation()).resolves.toEqual({ ok: false, reason: 'denied' })
  })

  it('reports a device with no geolocation api as unsupported', async () => {
    setGeolocation(undefined)

    await expect(getDeviceLocation()).resolves.toEqual({ ok: false, reason: 'unsupported' })
    expect(getCurrentPosition).not.toHaveBeenCalled()
  })
})

describe('geolocationMessage', () => {
  it('words the two failures differently', () => {
    expect(geolocationMessage('denied')).toMatch(/revisa los permisos/i)
    expect(geolocationMessage('unsupported')).toMatch(/no permite obtener la ubicación/i)
  })
})

describe('distanceBetween', () => {
  it('measures a known distance', () => {
    // Mexico City to Puebla: ~107 km.
    const metres = distanceBetween({ lat: 19.4326, lng: -99.1332 }, { lat: 19.0414, lng: -98.2063 })

    expect(metres / 1000).toBeGreaterThan(100)
    expect(metres / 1000).toBeLessThan(115)
  })

  it('is zero for the same point and symmetric between two', () => {
    const a = { lat: 19.4326, lng: -99.1332 }
    const b = { lat: 19.5, lng: -99.2 }

    expect(distanceBetween(a, a)).toBe(0)
    expect(distanceBetween(a, b)).toBeCloseTo(distanceBetween(b, a), 6)
  })

  // Flat-degree arithmetic is out by hundreds of metres at this latitude, which
  // would fire the refetch early or late depending on the direction travelled.
  it('accounts for longitude narrowing with latitude', () => {
    const eastWest = distanceBetween({ lat: 19.4, lng: -99.1 }, { lat: 19.4, lng: -99.0 })
    const northSouth = distanceBetween({ lat: 19.4, lng: -99.1 }, { lat: 19.5, lng: -99.1 })

    expect(eastWest).toBeLessThan(northSouth)
  })
})

describe('isValidCoords', () => {
  it('accepts a real pair and rejects anything unusable', () => {
    expect(isValidCoords(19.43, -99.13)).toBe(true)
    expect(isValidCoords(NaN, -99.13)).toBe(false)
    expect(isValidCoords(91, -99.13)).toBe(false)
    expect(isValidCoords(19.43, 181)).toBe(false)
  })
})
