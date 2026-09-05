import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { CatalogPage } from '../CatalogPage'
import { ToastProvider } from '@/components/ui/toast'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'
import type { Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'
import type { InstagramPost } from '../actions/fetchInstagramPosts'

vi.mock('@/sections/catalogs/actions/fetchMyCatalog')
vi.mock('../actions/fetchCatalogItems')
vi.mock('../actions/updateCatalog')
vi.mock('../actions/updateItem')
vi.mock('../actions/createItem')
vi.mock('../actions/deleteItem')
vi.mock('../actions/broadcastCatalog')
vi.mock('../actions/uploadCatalogImage')
vi.mock('../actions/deleteCatalogImage')
vi.mock('@/sections/publicCatalog/actions/fetchCatalogLocation')
vi.mock('@/sections/publicCatalog/actions/fetchCatalogQuestions')
vi.mock('../actions/createPhylloConnectToken')
vi.mock('../actions/fetchInstagramAccount')
vi.mock('../actions/fetchInstagramPosts')
vi.mock('../actions/importInstagramPosts', async (importOriginal) => {
  // MAX_POSTS_PER_IMPORT is a real constant the UI renders — keep it.
  const actual = await importOriginal<typeof import('../actions/importInstagramPosts')>()
  return { ...actual, importInstagramPosts: vi.fn() }
})
// The SDK modal is a third-party iframe; the connect outcome is the seam.
vi.mock('@/lib/phylloConnect', () => ({ openPhylloConnect: vi.fn() }))

import { fetchMyCatalog } from '@/sections/catalogs/actions/fetchMyCatalog'
import { fetchCatalogLocation } from '@/sections/publicCatalog/actions/fetchCatalogLocation'
import { fetchCatalogQuestions } from '@/sections/publicCatalog/actions/fetchCatalogQuestions'
import { fetchCatalogItems } from '../actions/fetchCatalogItems'
import { createPhylloConnectToken } from '../actions/createPhylloConnectToken'
import { fetchInstagramAccount } from '../actions/fetchInstagramAccount'
import { fetchInstagramPosts } from '../actions/fetchInstagramPosts'
import { importInstagramPosts } from '../actions/importInstagramPosts'
import { openPhylloConnect } from '@/lib/phylloConnect'

const mockCatalog: Catalog = {
  _id: 'cat1',
  userId: 'user1',
  alias: 'Tienda de Prueba',
  welcomeText: '',
  description: '',
  payOptions: [],
  deliveryType: [],
  location: '',
  locationZip: '',
  deliveryDates: [],
  deliveryLocations: [],
}

const mockItems: Item[] = [
  {
    _id: 'item1',
    name: 'Bolsa tejida',
    description: '',
    price: 35000,
    imgPath: '',
    outOfStock: false,
    updatedOn: '2024-01-01T00:00:00Z',
    catalogId: 'cat1',
  },
]

function post(overrides: Partial<InstagramPost> & { contentId: string }): InstagramPost {
  return {
    title: 'Blusa de lino',
    description: 'Blusa de lino',
    format: 'IMAGE',
    url: 'https://www.instagram.com/p/abc/',
    publishedAt: '2026-08-30T00:00:00.000Z',
    previewUrl: 'https://scontent.cdninstagram.com/signed.jpg',
    imported: false,
    itemId: null,
    ...overrides,
  }
}

const feed = [
  post({ contentId: 'c1', title: 'Blusa de lino' }),
  post({ contentId: 'c2', title: 'Aretes de latón' }),
  post({ contentId: 'c3', title: 'Rebozo bordado', imported: true, itemId: 'item9' }),
  post({ contentId: 'c4', title: 'Detrás de cámaras', format: 'VIDEO' }),
]

function renderPage() {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/catalog']}>
        <Routes>
          <Route path="/catalog" element={<CatalogPage />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  )
}

/** Opens the catalog, then the import dialog, and returns it. */
async function openImportDialog(user: ReturnType<typeof userEvent.setup>) {
  renderPage()
  const openButton = await screen.findByRole('button', { name: 'Importar de Instagram' })
  await user.click(openButton)
  return screen.getByRole('dialog', { name: 'Importar de Instagram' })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchMyCatalog).mockResolvedValue(mockCatalog)
  vi.mocked(fetchCatalogItems).mockResolvedValue(mockItems)
  vi.mocked(fetchCatalogLocation).mockResolvedValue(null)
  vi.mocked(fetchCatalogQuestions).mockResolvedValue([])

  vi.mocked(fetchInstagramAccount).mockResolvedValue({
    connected: true,
    status: 'CONNECTED',
    phylloAccountId: 'acc1',
    platformUsername: 'la_tienda_de_ana',
    lastSyncedAt: '2026-09-04T18:22:10.001Z',
  })
  vi.mocked(fetchInstagramPosts).mockResolvedValue({ ok: true, posts: feed })
  vi.mocked(createPhylloConnectToken).mockResolvedValue({
    ok: true,
    token: {
      sdkToken: 'tok',
      phylloUserId: 'u1',
      workPlatformId: 'wp1',
      expiresAt: '2026-09-11T17:37:27.525002',
    },
  })
  vi.mocked(openPhylloConnect).mockResolvedValue({ status: 'connected', accountId: 'acc1' })
  vi.mocked(importInstagramPosts).mockResolvedValue({ ok: true, imported: [], skipped: [] })
})

describe('Instagram import', () => {
  it('offers the connect CTA when no account is linked', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchInstagramAccount).mockResolvedValue({
      connected: false,
      status: 'PENDING',
      phylloAccountId: null,
      platformUsername: null,
      lastSyncedAt: null,
    })

    const dialog = await openImportDialog(user)

    expect(await within(dialog).findByText('Conecta tu Instagram')).toBeInTheDocument()
    expect(
      within(dialog).getByRole('button', { name: 'Conectar Instagram' }),
    ).toBeInTheDocument()
    expect(fetchInstagramPosts).not.toHaveBeenCalled()
  })

  it('says reconnect, not connect, when the session expired', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchInstagramAccount).mockResolvedValue({
      connected: false,
      status: 'SESSION_EXPIRED',
      phylloAccountId: 'acc1',
      platformUsername: 'la_tienda_de_ana',
      lastSyncedAt: null,
    })

    const dialog = await openImportDialog(user)

    expect(await within(dialog).findByText('Vuelve a conectar tu Instagram')).toBeInTheDocument()
    expect(
      within(dialog).getByRole('button', { name: 'Reconectar Instagram' }),
    ).toBeInTheDocument()
  })

  it('loads the feed after the Connect modal reports a link', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchInstagramAccount)
      .mockResolvedValueOnce({
        connected: false,
        status: 'NOT_CONNECTED',
        phylloAccountId: null,
        platformUsername: null,
        lastSyncedAt: null,
      })
      .mockResolvedValue({
        connected: true,
        status: 'CONNECTED',
        phylloAccountId: 'acc1',
        platformUsername: 'la_tienda_de_ana',
        lastSyncedAt: null,
      })

    const dialog = await openImportDialog(user)
    await user.click(await within(dialog).findByRole('button', { name: 'Conectar Instagram' }))

    expect(await within(dialog).findByText('Conectado como @la_tienda_de_ana')).toBeInTheDocument()
    expect(await within(dialog).findByRole('button', { name: 'Blusa de lino' })).toBeInTheDocument()
  })

  it('lets only photos that are not already items be selected', async () => {
    const user = userEvent.setup()
    const dialog = await openImportDialog(user)

    const photo = await within(dialog).findByRole('button', { name: 'Blusa de lino' })
    const alreadyImported = within(dialog).getByRole('button', { name: 'Rebozo bordado' })
    const video = within(dialog).getByRole('button', { name: 'Detrás de cámaras' })

    expect(alreadyImported).toBeDisabled()
    expect(video).toBeDisabled()
    expect(within(dialog).getByText('Ya importada')).toBeInTheDocument()
    expect(within(dialog).getByText('Solo fotos')).toBeInTheDocument()

    await user.click(photo)
    expect(photo).toHaveAttribute('aria-pressed', 'true')
    expect(within(dialog).getByText('1 de 10 seleccionadas')).toBeInTheDocument()
  })

  it('imports the selection by contentId alone and refreshes the catalog items', async () => {
    const user = userEvent.setup()
    vi.mocked(importInstagramPosts).mockResolvedValue({
      ok: true,
      imported: [
        {
          contentId: 'c1',
          item: { _id: 'item_new', name: 'Blusa de lino', price: 0, imgPath: 'https://cdn/x.webp' },
        },
      ],
      skipped: [],
    })

    const dialog = await openImportDialog(user)
    await user.click(await within(dialog).findByRole('button', { name: 'Blusa de lino' }))
    await user.click(within(dialog).getByRole('button', { name: /^Importar 1$/ }))

    await waitFor(() => expect(importInstagramPosts).toHaveBeenCalledWith([{ contentId: 'c1' }]))
    expect(await within(dialog).findByText('Se importó 1 publicación.')).toBeInTheDocument()
    // The feed is re-read so the "ya importada" badges repaint, and the grid
    // behind the dialog re-reads its items to show the new product.
    await waitFor(() => expect(fetchInstagramPosts).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(fetchCatalogItems).toHaveBeenCalledTimes(2))
  })

  it('reports partial success with a readable reason for each skipped post', async () => {
    const user = userEvent.setup()
    vi.mocked(importInstagramPosts).mockResolvedValue({
      ok: true,
      imported: [
        {
          contentId: 'c1',
          item: { _id: 'item_new', name: 'Blusa de lino', price: 0, imgPath: 'https://cdn/x.webp' },
        },
      ],
      skipped: [{ contentId: 'c2', reason: 'That post has no downloadable image' }],
    })

    const dialog = await openImportDialog(user)
    await user.click(await within(dialog).findByRole('button', { name: 'Blusa de lino' }))
    await user.click(within(dialog).getByRole('button', { name: 'Aretes de latón' }))
    await user.click(within(dialog).getByRole('button', { name: /^Importar 2$/ }))

    expect(await within(dialog).findByText('Se importó 1 publicación.')).toBeInTheDocument()
    expect(
      within(dialog).getByText('No pudimos descargar su imagen. Actualiza y vuelve a intentarlo.'),
    ).toBeInTheDocument()
  })

  it('sends the seller back to the connect screen when the feed says not connected', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchInstagramPosts).mockResolvedValue({ ok: false, reason: 'notConnected' })

    const dialog = await openImportDialog(user)

    expect(await within(dialog).findByText('Conecta tu Instagram')).toBeInTheDocument()
  })

  it('offers a retry when the catalog is full', async () => {
    const user = userEvent.setup()
    vi.mocked(importInstagramPosts).mockResolvedValue({ ok: false, reason: 'catalogFull' })

    const dialog = await openImportDialog(user)
    await user.click(await within(dialog).findByRole('button', { name: 'Blusa de lino' }))
    await user.click(within(dialog).getByRole('button', { name: /^Importar 1$/ }))

    const alert = await within(dialog).findByRole('alert')
    expect(alert).toHaveTextContent('Tu catálogo llegó al máximo de artículos.')
  })
})
