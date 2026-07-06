import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CatalogsPage } from '../CatalogsPage'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'

vi.mock('../actions/fetchMyCatalogs')
vi.mock('../actions/createCatalog')

import { fetchMyCatalogs } from '../actions/fetchMyCatalogs'
import { createCatalog } from '../actions/createCatalog'

const sampleCatalog = (overrides: Partial<Catalog> = {}): Catalog => ({
  _id: 'cat1',
  userId: 'me',
  alias: 'Tienda de Prueba',
  welcomeText: 'Bienvenidos',
  description: 'Descripción de prueba',
  payOptions: ['cash'],
  deliveryType: ['delivery'],
  location: 'Oaxaca, México',
  locationZip: '68000',
  deliveryDates: [],
  deliveryLocations: [],
  ...overrides,
})

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<CatalogsPage />} />
        <Route path="/catalog" element={<div>Catálogo edit</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('CatalogsPage', () => {
  it('shows empty state when the seller has no catalogs', async () => {
    vi.mocked(fetchMyCatalogs).mockResolvedValue([])
    renderPage()

    expect(await screen.findByText('Aún no tienes catálogos')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /crear mi primer catálogo/i })).toBeInTheDocument()
  })

  it('renders the seller catalogs as cards', async () => {
    vi.mocked(fetchMyCatalogs).mockResolvedValue([
      sampleCatalog({ _id: 'a', alias: 'Tienda A' }),
      sampleCatalog({ _id: 'b', alias: 'Tienda B' }),
    ])
    renderPage()

    expect(await screen.findByText('Tienda A')).toBeInTheDocument()
    expect(screen.getByText('Tienda B')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /abrir catálogo tienda a/i })).toHaveAttribute(
      'href',
      '/catalog',
    )
  })

  it('surfaces an error state with retry when the fetch fails', async () => {
    vi.mocked(fetchMyCatalogs).mockRejectedValueOnce(new Error('boom'))
    renderPage()

    expect(await screen.findByText(/no pudimos cargar tus catálogos/i)).toBeInTheDocument()

    vi.mocked(fetchMyCatalogs).mockResolvedValueOnce([sampleCatalog({ alias: 'Tienda Recuperada' })])
    await userEvent.setup().click(screen.getByRole('button', { name: /reintentar/i }))

    expect(await screen.findByText('Tienda Recuperada')).toBeInTheDocument()
  })

  it('creates a new catalog and reveals it in the list', async () => {
    vi.mocked(fetchMyCatalogs).mockResolvedValue([])
    vi.mocked(createCatalog).mockResolvedValue(
      sampleCatalog({ _id: 'new', alias: 'Mi nuevo catálogo', description: 'Descripción válida' }),
    )

    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /crear mi primer catálogo/i }))

    expect(screen.getByRole('dialog', { name: 'Nuevo catálogo' })).toBeInTheDocument()

    await user.type(screen.getByLabelText('Nombre'), 'Mi nuevo catálogo')
    await user.type(screen.getByLabelText('Descripción'), 'Descripción válida')
    await user.click(screen.getByRole('button', { name: /^crear catálogo$/i }))

    expect(await screen.findByText('Mi nuevo catálogo')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(createCatalog).toHaveBeenCalledWith(
      expect.objectContaining({
        alias: 'Mi nuevo catálogo',
        description: 'Descripción válida',
        payOptions: ['cash'],
        deliveryType: ['location-pickup'],
      }),
    )
  })

  it('validates required fields before submitting the create form', async () => {
    vi.mocked(fetchMyCatalogs).mockResolvedValue([])
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /crear mi primer catálogo/i }))
    await user.click(screen.getByRole('button', { name: /^crear catálogo$/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/ingresa un nombre/i)
    expect(createCatalog).not.toHaveBeenCalled()
  })
})
