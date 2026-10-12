import type { ReactNode } from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CENTER } from '@/lib/geolocation'
import { readLastLocation, saveLastLocation } from '@/lib/lastLocation'
import { INITIAL_ZOOM, MAX_ZOOM, MIN_ZOOM } from '../mapView'
import { MapSearchPage } from '../MapSearchPage'
import { lookupNearbyCatalogs, type NearbyCatalog } from '../actions/lookupNearbyCatalogs'

const nearbyShop = (overrides: Partial<NearbyCatalog> = {}): NearbyCatalog => ({
  catalogId: 'c1',
  alias: 'Pan de Ana',
  image: 'https://images.alkachof.mx/pan.webp',
  lat: 17.071,
  lng: -96.721,
  city: 'Oaxaca de Juárez',
  neighborhood: 'Centro',
  distanceMeters: 1100,
  ...overrides,
})

/** A successful circle of results around the fix. */
function lookupReturns(results: NearbyCatalog[], extra: { truncated?: boolean } = {}) {
  vi.mocked(lookupNearbyCatalogs).mockResolvedValue({
    ok: true,
    results,
    truncated: extra.truncated ?? false,
    radiusMeters: 7000,
  })
}

/** The point the nth lookup was made at. */
function lookupPoint(call: number) {
  return vi.mocked(lookupNearbyCatalogs).mock.calls[call][0]
}

/** Simulates the map settling after a pan, at `lat`/`lng`. */
function panTo(lat: number, lng: number) {
  // The latest registration only — the mock collects one per render.
  const handlers = mapEvents[mapEvents.length - 1]
  act(() => {
    handlers.moveend?.({ target: { getCenter: () => ({ lat, lng }) } })
  })
}

// Leaflet needs a sized DOM that jsdom doesn't provide, so the map is stubbed —
// but its props are captured, because the zoom clamp is an acceptance criterion
// with no visible symptom when it breaks.
const { mapProps, flyTo, mapEvents, mapInstance } = vi.hoisted(() => {
  const flyTo = vi.fn()
  return {
    mapProps: [] as Record<string, unknown>[],
    flyTo,
    /** The handler sets registered through `useMapEvents`, so a pan is fireable. */
    mapEvents: [] as Record<string, (event: unknown) => void>[],
    /**
     * One stable instance, as real react-leaflet hands back: a fresh object per
     * render would re-fire every effect that depends on the map.
     */
    mapInstance: { flyTo },
  }
})

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children, ...rest }: { children?: ReactNode }) => {
    mapProps.push(rest)
    return <div data-testid="map">{children}</div>
  },
  TileLayer: () => null,
  Marker: ({
    title,
    icon,
    eventHandlers,
  }: {
    title?: string
    icon?: { options?: { html?: string } }
    eventHandlers?: { click?: () => void }
  }) => (
    <button
      type="button"
      data-testid="marker"
      data-title={title}
      data-icon={icon?.options?.html}
      aria-label={title}
      onClick={eventHandlers?.click}
    />
  ),
  useMap: () => mapInstance,
  useMapEvents: (handlers: Record<string, (event: unknown) => void>) => {
    mapEvents.push(handlers)
    return mapInstance
  },
}))

vi.mock('../actions/lookupNearbyCatalogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../actions/lookupNearbyCatalogs')>()),
  lookupNearbyCatalogs: vi.fn(),
}))

const getCurrentPosition = vi.fn()

function setGeolocation(value: unknown) {
  Object.defineProperty(globalThis.navigator, 'geolocation', { value, configurable: true })
}

/** Resolves the position request with a fix in Oaxaca. */
function positionFound() {
  getCurrentPosition.mockImplementation((success: PositionCallback) =>
    success({ coords: { latitude: 17.07, longitude: -96.72 } } as GeolocationPosition),
  )
}

function positionDenied() {
  getCurrentPosition.mockImplementation(
    (_success: PositionCallback, error: PositionErrorCallback) =>
      error({ code: 1 } as GeolocationPositionError),
  )
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/map']}>
      <Routes>
        <Route path="/map" element={<MapSearchPage />} />
        <Route path="/catalog/:catalogId" element={<CatalogStub />} />
      </Routes>
    </MemoryRouter>,
  )
}

/** Stands in for the public catalog page, so navigation is observable. */
function CatalogStub() {
  const { catalogId } = useParams()
  return <p>catálogo público {catalogId}</p>
}

beforeEach(() => {
  mapProps.length = 0
  mapEvents.length = 0
  flyTo.mockReset()
  getCurrentPosition.mockReset()
  setGeolocation({ getCurrentPosition })
  vi.mocked(lookupNearbyCatalogs).mockReset()
  lookupReturns([])
})

describe('MapSearchPage', () => {
  it('asks for the device position once and flies there', async () => {
    positionFound()
    renderPage()

    await waitFor(() => expect(flyTo).toHaveBeenCalledWith([17.07, -96.72], INITIAL_ZOOM))
    expect(getCurrentPosition).toHaveBeenCalledTimes(1)
  })

  it('renders a pannable map on the fallback center while the fix is pending', async () => {
    // Never calls back: the position request stays in flight.
    getCurrentPosition.mockImplementation(() => {})
    renderPage()

    expect(screen.getByTestId('map')).toBeInTheDocument()
    expect(mapProps[0].center).toEqual([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng])
    expect(await screen.findByText(/obteniendo tu ubicación/i)).toBeInTheDocument()
  })

  it('bounds how far the map can zoom out', () => {
    positionFound()
    renderPage()

    expect(mapProps[0].minZoom).toBe(MIN_ZOOM)
    expect(mapProps[0].maxZoom).toBe(MAX_ZOOM)
  })

  it('recenters without asking for the position again', async () => {
    positionFound()
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => expect(flyTo).toHaveBeenCalledTimes(1))

    await user.click(screen.getByRole('button', { name: /volver a mi ubicación/i }))

    await waitFor(() => expect(flyTo).toHaveBeenCalledTimes(2))
    expect(getCurrentPosition).toHaveBeenCalledTimes(1)
  })

  it('asks again when recentering with no position in hand', async () => {
    positionDenied()
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('alert')

    await user.click(screen.getByRole('button', { name: /volver a mi ubicación/i }))

    await waitFor(() => expect(getCurrentPosition).toHaveBeenCalledTimes(2))
  })

  it('keeps the map usable and offers a retry when permission is refused', async () => {
    positionDenied()
    renderPage()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/no pudimos obtener tu ubicación/i)
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument()
    expect(screen.getByTestId('map')).toBeInTheDocument()
  })

  it('offers no retry when the device has no geolocation at all', async () => {
    setGeolocation(undefined)
    renderPage()

    expect(await screen.findByText(/no permite obtener la ubicación/i)).toBeInTheDocument()
    expect(getCurrentPosition).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: /reintentar/i })).not.toBeInTheDocument()
  })

  it('shows the search field as not yet available', () => {
    positionFound()
    renderPage()

    expect(screen.getByRole('searchbox', { name: /buscar catálogos/i })).toBeDisabled()
    expect(screen.getByText(/estará disponible muy pronto/i)).toBeInTheDocument()
  })
})

describe('MapSearchPage, remembering where the user was', () => {
  it('opens on the position remembered from last time', () => {
    saveLastLocation({ lat: 17.07, lng: -96.72 })
    // Never calls back, so the hint is all the screen has to go on.
    getCurrentPosition.mockImplementation(() => {})
    renderPage()

    expect(mapProps[0].center).toEqual([17.07, -96.72])
    expect(mapProps[0].zoom).toBe(INITIAL_ZOOM)
  })

  it('pulls out to the overview when there is nothing remembered', () => {
    getCurrentPosition.mockImplementation(() => {})
    renderPage()

    expect(mapProps[0].center).toEqual([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng])
    expect(mapProps[0].zoom).toBe(MIN_ZOOM)
  })

  it('remembers a fix for the next visit', async () => {
    positionFound()
    renderPage()

    await waitFor(() => expect(readLastLocation()).toEqual({ lat: 17.07, lng: -96.72 }))
  })

  // The dot means "you are here". A remembered position is where the map looks,
  // not a fix, so asserting it with the dot would be a lie.
  it('draws no position dot for a remembered position alone', async () => {
    saveLastLocation({ lat: 17.07, lng: -96.72 })
    getCurrentPosition.mockImplementation(() => {})
    renderPage()

    expect(await screen.findByText(/obteniendo tu ubicación/i)).toBeInTheDocument()
    expect(screen.queryByTestId('marker')).not.toBeInTheDocument()
  })

  it('draws the position dot once a fix arrives', async () => {
    positionFound()
    renderPage()

    expect(await screen.findByTestId('marker')).toHaveAttribute('data-title', 'Tu ubicación')
  })

  it('remembers nothing when the position is refused', async () => {
    positionDenied()
    renderPage()
    await screen.findByRole('alert')

    expect(readLastLocation()).toBeNull()
  })
})

describe('MapSearchPage, the catalogs nearby', () => {
  it('looks up catalogs at the position it was given', async () => {
    positionFound()
    lookupReturns([nearbyShop()])
    renderPage()

    await waitFor(() => expect(lookupNearbyCatalogs).toHaveBeenCalledTimes(1))
    expect(lookupPoint(0)).toEqual({ lat: 17.07, lng: -96.72 })
    expect(await screen.findByText('1 catálogo cerca')).toBeInTheDocument()
  })

  it('opens the public catalog of the shop that is tapped', async () => {
    positionFound()
    lookupReturns([nearbyShop(), nearbyShop({ catalogId: 'c2', alias: 'Dulces La Abuela' })])
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /dulces la abuela/i }))

    expect(await screen.findByText('catálogo público c2')).toBeInTheDocument()
  })

  it("pins the shop with its own catalog image", async () => {
    positionFound()
    lookupReturns([nearbyShop({ image: 'https://images.alkachof.mx/pan.webp' })])
    renderPage()

    const marker = await screen.findByRole('button', { name: /pan de ana/i })
    expect(marker.getAttribute('data-icon')).toContain('https://images.alkachof.mx/pan.webp')
  })

  it('names the shop and its distance on the pin', async () => {
    positionFound()
    lookupReturns([nearbyShop()])
    renderPage()

    expect(await screen.findByRole('button', { name: 'Pan de Ana, a 1.1 km' })).toBeInTheDocument()
  })

  it('names a catalog whose seller never named it', async () => {
    positionFound()
    lookupReturns([nearbyShop({ alias: '' })])
    renderPage()

    expect(
      await screen.findByRole('button', { name: /catálogo sin nombre/i }),
    ).toBeInTheDocument()
  })

  // `total` counts rows the api withheld (banned or unverified sellers), so it
  // overstates the map. `results.length` is the only number to show.
  it('counts what it can draw, never the api total', async () => {
    positionFound()
    lookupReturns([nearbyShop()])
    renderPage()

    expect(await screen.findByText('1 catálogo cerca')).toBeInTheDocument()
    expect(screen.queryByText(/\b7\b/)).not.toBeInTheDocument()
  })

  it('says there is more only when the api says the circle was truncated', async () => {
    positionFound()
    lookupReturns([nearbyShop()], { truncated: true })
    renderPage()

    expect(await screen.findByText('Más de 1 catálogo cerca')).toBeInTheDocument()
  })

  it('reads an empty circle as an answer, not a failure', async () => {
    positionFound()
    lookupReturns([])
    renderPage()

    expect(await screen.findByText(/no encontramos catálogos cerca/i)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('stops asking when the deployment has proximity search switched off', async () => {
    positionFound()
    vi.mocked(lookupNearbyCatalogs).mockResolvedValue({ ok: false, reason: 'unavailable' })
    renderPage()

    expect(await screen.findByText(/no está disponible por ahora/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /reintentar/i })).not.toBeInTheDocument()

    panTo(17.2, -96.72)

    // A 404 is terminal: nothing the user does asks again.
    expect(lookupNearbyCatalogs).toHaveBeenCalledTimes(1)
  })

  it('offers a retry when the first lookup fails outright', async () => {
    positionFound()
    vi.mocked(lookupNearbyCatalogs).mockResolvedValue({
      ok: false,
      reason: 'error',
      message: 'boom',
    })
    renderPage()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/no pudimos buscar catálogos cerca/i)
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument()
  })
})

describe('MapSearchPage, one lookup per circle', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))
  afterEach(() => vi.useRealTimers())

  it('does not look up again while the map stays inside the loaded circle', async () => {
    positionFound()
    lookupReturns([nearbyShop()])
    renderPage()
    await waitFor(() => expect(lookupNearbyCatalogs).toHaveBeenCalledTimes(1))

    // Well past the 10 s floor, so only the distance rule can be holding it.
    act(() => vi.advanceTimersByTime(30_000))
    panTo(17.08, -96.72) // ~1.1 km from the starting point
    panTo(17.03, -96.75) // ~5.5 km from it — still inside

    expect(lookupNearbyCatalogs).toHaveBeenCalledTimes(1)
  })

  it('looks up again once the map leaves the loaded circle', async () => {
    positionFound()
    lookupReturns([nearbyShop()])
    renderPage()
    await waitFor(() => expect(lookupNearbyCatalogs).toHaveBeenCalledTimes(1))

    act(() => vi.advanceTimersByTime(30_000))
    panTo(17.2, -96.72) // ~14 km from the starting point

    await waitFor(() => expect(lookupNearbyCatalogs).toHaveBeenCalledTimes(2))
    // The new circle is centred on where the map is now, not on the old point.
    expect(lookupPoint(1)).toEqual({ lat: 17.2, lng: -96.72 })
  })

  // The 10 s floor is the client's own rule; the server's budget is 6/minute.
  it('defers a lookup under the self-throttle instead of dropping it', async () => {
    positionFound()
    lookupReturns([nearbyShop()])
    renderPage()
    await waitFor(() => expect(lookupNearbyCatalogs).toHaveBeenCalledTimes(1))

    panTo(17.2, -96.72)

    expect(lookupNearbyCatalogs).toHaveBeenCalledTimes(1)

    act(() => vi.advanceTimersByTime(10_000))

    await waitFor(() => expect(lookupNearbyCatalogs).toHaveBeenCalledTimes(2))
  })

  it('keeps showing results when a refresh is rate limited', async () => {
    positionFound()
    lookupReturns([nearbyShop()])
    renderPage()
    await waitFor(() => expect(lookupNearbyCatalogs).toHaveBeenCalledTimes(1))

    vi.mocked(lookupNearbyCatalogs).mockResolvedValue({
      ok: false,
      reason: 'rateLimited',
      availableAt: new Date(Date.now() + 60_000).toISOString(),
    })
    act(() => vi.advanceTimersByTime(30_000))
    panTo(17.2, -96.72)

    // The marker and the count stay; the strip only admits it is not fresh.
    expect(await screen.findByText(/sin actualizar/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /pan de ana/i })).toBeInTheDocument()
    expect(screen.getByText(/1 catálogo cerca/)).toBeInTheDocument()
  })

  it('holds off until the 429 window has passed', async () => {
    positionFound()
    lookupReturns([nearbyShop()])
    renderPage()
    await waitFor(() => expect(lookupNearbyCatalogs).toHaveBeenCalledTimes(1))

    vi.mocked(lookupNearbyCatalogs).mockResolvedValue({
      ok: false,
      reason: 'rateLimited',
      availableAt: new Date(Date.now() + 60_000).toISOString(),
    })
    act(() => vi.advanceTimersByTime(30_000))
    panTo(17.2, -96.72)
    await waitFor(() => expect(lookupNearbyCatalogs).toHaveBeenCalledTimes(2))

    // Past the 10 s floor but inside the server's window: still refused.
    act(() => vi.advanceTimersByTime(15_000))
    panTo(17.25, -96.72)

    expect(lookupNearbyCatalogs).toHaveBeenCalledTimes(2)

    act(() => vi.advanceTimersByTime(60_000))

    await waitFor(() => expect(lookupNearbyCatalogs).toHaveBeenCalledTimes(3))
  })

  it('drops a deferred lookup if the map comes back inside the circle', async () => {
    positionFound()
    lookupReturns([nearbyShop()])
    renderPage()
    await waitFor(() => expect(lookupNearbyCatalogs).toHaveBeenCalledTimes(1))

    panTo(17.2, -96.72) // outside, so a lookup is queued behind the throttle
    panTo(17.071, -96.721) // back home before it fires

    act(() => vi.advanceTimersByTime(10_000))

    expect(lookupNearbyCatalogs).toHaveBeenCalledTimes(1)
  })
})
