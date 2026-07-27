import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { LocationMapPicker } from '../components/LocationMapPicker'

// Stub the Leaflet map so the geolocation behavior can be tested without a real
// map (Leaflet needs a sized DOM that jsdom doesn't provide).
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  TileLayer: () => null,
  Marker: () => null,
  useMapEvents: () => ({ flyTo: vi.fn() }),
}))

const getCurrentPosition = vi.fn()

function setGeolocation(value: unknown) {
  Object.defineProperty(global.navigator, 'geolocation', { value, configurable: true })
}

beforeEach(() => {
  getCurrentPosition.mockReset()
  setGeolocation({ getCurrentPosition })
})

describe('LocationMapPicker geolocation', () => {
  it('reports the device coordinates on success', async () => {
    getCurrentPosition.mockImplementation((success: PositionCallback) =>
      success({ coords: { latitude: 20.5, longitude: -100.3 } } as GeolocationPosition),
    )
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(<LocationMapPicker value={null} onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: /usar mi ubicación actual/i }))

    expect(getCurrentPosition).toHaveBeenCalled()
    expect(onChange).toHaveBeenCalledWith({ lat: 20.5, lng: -100.3 })
  })

  it('shows an error and reports nothing when geolocation fails', async () => {
    getCurrentPosition.mockImplementation((_success: PositionCallback, error: PositionErrorCallback) =>
      error({ code: 1 } as GeolocationPositionError),
    )
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(<LocationMapPicker value={null} onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: /usar mi ubicación actual/i }))

    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/no pudimos obtener tu ubicación/i)
  })

  it('shows an error when the device has no geolocation support', async () => {
    setGeolocation(undefined)
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(<LocationMapPicker value={null} onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: /usar mi ubicación actual/i }))

    expect(getCurrentPosition).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/no permite obtener la ubicación/i)
  })
})
