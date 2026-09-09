import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { CatalogPage } from '../CatalogPage'
import { ToastProvider } from '@/components/ui/toast'
import { withQueryClient } from '@/test/renderWithProviders'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'
import type { Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'
import type { InstagramPost } from '../actions/fetchInstagramPosts'
import type { InstagramStatus } from '../actions/fetchInstagramStatus'
import { MAX_CATALOG_ITEMS } from '@/lib/catalogLimits'

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
vi.mock('../actions/fetchInstagramStatus')
vi.mock('../actions/searchInstagramProfiles')
vi.mock('../actions/enrollInstagram')
vi.mock('../actions/fetchInstagramPosts')
vi.mock('../actions/importInstagramPosts', async (importOriginal) => {
  // MAX_POSTS_PER_IMPORT is a real constant the UI renders — keep it.
  const actual = await importOriginal<typeof import('../actions/importInstagramPosts')>()
  return { ...actual, importInstagramPosts: vi.fn() }
})

import { fetchMyCatalog } from '@/sections/catalogs/actions/fetchMyCatalog'
import { fetchCatalogLocation } from '@/sections/publicCatalog/actions/fetchCatalogLocation'
import { fetchCatalogQuestions } from '@/sections/publicCatalog/actions/fetchCatalogQuestions'
import { fetchCatalogItems } from '../actions/fetchCatalogItems'
import { fetchInstagramStatus } from '../actions/fetchInstagramStatus'
import { searchInstagramProfiles } from '../actions/searchInstagramProfiles'
import { enrollInstagram } from '../actions/enrollInstagram'
import { fetchInstagramPosts } from '../actions/fetchInstagramPosts'
import { importInstagramPosts } from '../actions/importInstagramPosts'

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

/** Far enough out that it never drifts past `now` mid-suite. */
const COOLDOWN_UNTIL = '2026-12-24T18:00:00.000Z'

/**
 * `/instagram/status` answers enrollment *and* availability. Defaults to
 * available, so a test opts in to the cooldown rather than restating it.
 */
function status(overrides: Partial<InstagramStatus>): InstagramStatus {
  return { enrolled: true, available: true, nextAvailable: null, cooldownDays: 7, ...overrides }
}

function post(overrides: Partial<InstagramPost> & { externalPostId: string }): InstagramPost {
  return {
    caption: 'Blusa de lino',
    mediaType: 'IMAGE',
    permalink: 'https://www.instagram.com/p/abc/',
    publishedAt: '2026-08-30T00:00:00.000Z',
    mediaUrl: 'https://scontent.cdninstagram.com/signed.jpg',
    isConverted: false,
    convertedItemId: null,
    ...overrides,
  }
}

const feed = [
  post({ externalPostId: 'c1', caption: 'Blusa de lino' }),
  post({ externalPostId: 'c2', caption: 'Aretes de latón' }),
  post({ externalPostId: 'c3', caption: 'Rebozo bordado', isConverted: true, convertedItemId: 'item9' }),
  post({ externalPostId: 'c4', caption: 'Detrás de cámaras', mediaType: 'VIDEO' }),
]

const candidates = [
  {
    profileId: 'p1', alias: 'la_tienda_de_ana', fullName: 'La Tienda de Ana',
    avatarUrl: 'https://cdn/ana.jpg', isPrivate: false, isVerified: false, postCount: 14,
  },
  {
    profileId: 'p2', alias: 'tienda_ana_privada', fullName: 'Ana (privada)',
    avatarUrl: 'https://cdn/priv.jpg', isPrivate: true, isVerified: false, postCount: 0,
  },
]

const attestationCopy = {
  version: '1.0',
  template:
    'Soy el dueño/a o administrador de la cuenta {instagram_account}. Entiendo que al ' +
    'importar contenido de Instagram de una cuenta que no sea de mi propiedad, estoy ' +
    'violando los términos y condiciones de Alkachof y mi cuenta podría ser suspendida.',
  placeholder: '{instagram_account}',
}

function renderPage() {
  // A fresh client per render: the Instagram status is cached, and a client
  // shared across tests would answer one test's query from another's write.
  return render(
    withQueryClient(
      <ToastProvider>
        <MemoryRouter initialEntries={['/catalog']}>
          <Routes>
            <Route path="/catalog" element={<CatalogPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>,
    ),
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

  vi.mocked(fetchInstagramStatus).mockResolvedValue(status({ enrolled: true }))
  // The API resolves one exact handle, so a lookup returns 0 or 1 — never a
  // list of near matches. Fixtures mirror that.
  vi.mocked(searchInstagramProfiles).mockResolvedValue({
    ok: true, profiles: [candidates[0]], attestation: attestationCopy,
  })
  vi.mocked(enrollInstagram).mockResolvedValue({ ok: true })
  vi.mocked(fetchInstagramPosts).mockResolvedValue({ ok: true, posts: feed })
  vi.mocked(importInstagramPosts).mockResolvedValue({ ok: true, imported: [], skipped: [], nextAvailable: null })
})

describe('Instagram import', () => {
  describe('enrollment (first time)', () => {
    beforeEach(() => {
      vi.mocked(fetchInstagramStatus).mockResolvedValue(status({ enrolled: false }))
    })

    it('opens on the search box and loads no feed until an account is linked', async () => {
      const user = userEvent.setup()
      const dialog = await openImportDialog(user)

      expect(await within(dialog).findByText('Escribe tu usuario de Instagram')).toBeInTheDocument()
      // Both requirements are stated before the seller invests any typing: the
      // exact handle, and that the account has to be public.
      expect(within(dialog).getByText(/tal como aparece en tu perfil/)).toBeInTheDocument()
      expect(within(dialog).getByText(/debe ser pública/)).toBeInTheDocument()
      expect(fetchInstagramPosts).not.toHaveBeenCalled()
    })

    it('strips a typed @ before searching', async () => {
      const user = userEvent.setup()
      const dialog = await openImportDialog(user)

      await user.type(await within(dialog).findByLabelText('Usuario de Instagram'), '@Mi_Negocio')
      await user.click(within(dialog).getByRole('button', { name: 'Buscar' }))

      await waitFor(() => expect(searchInstagramProfiles).toHaveBeenCalledWith('Mi_Negocio'))
    })

    // Hiding private accounts would make the seller think theirs was not found
    // and retype the same handle forever. Showing them, disabled, with the
    // reason, is what actually explains the dead end.
    it('shows a private account but refuses to enroll it, explaining why', async () => {
      const user = userEvent.setup()
      vi.mocked(searchInstagramProfiles).mockResolvedValue({
        ok: true, profiles: [candidates[1]], attestation: attestationCopy,
      })
      const dialog = await openImportDialog(user)

      await user.type(
        await within(dialog).findByLabelText('Usuario de Instagram'),
        'tienda_ana_privada',
      )
      await user.click(within(dialog).getByRole('button', { name: 'Buscar' }))

      const privateRow = await within(dialog).findByRole('button', { name: '@tienda_ana_privada' })
      expect(within(dialog).getByText('Cuenta privada')).toBeInTheDocument()

      await user.click(privateRow)

      expect(
        await within(dialog).findByText('La cuenta @tienda_ana_privada es privada'),
      ).toBeInTheDocument()
      expect(enrollInstagram).not.toHaveBeenCalled()
    })

    // The attestation is the whole abuse control, so it has to be a deliberate
    // act: never pre-ticked, and the commit is dead until it is ticked.
    it('keeps the commit disabled until the ownership attestation is ticked', async () => {
      const user = userEvent.setup()
      const dialog = await openImportDialog(user)

      await user.type(await within(dialog).findByLabelText('Usuario de Instagram'), 'ana')
      await user.click(within(dialog).getByRole('button', { name: 'Buscar' }))
      await user.click(await within(dialog).findByRole('button', { name: '@la_tienda_de_ana' }))

      const checkbox = await within(dialog).findByRole('checkbox')
      const commit = within(dialog).getByRole('button', { name: 'Vincular cuenta' })

      expect(checkbox).not.toBeChecked()
      expect(commit).toBeDisabled()

      // The server's sentence, with the chosen handle substituted in.
      expect(
        within(dialog).getByText(/Soy el dueño\/a o administrador de la cuenta @la_tienda_de_ana\./),
      ).toBeInTheDocument()
      // Permanence is stated where the seller commits, not buried earlier.
      expect(
        within(dialog).getByText('Solo puedes vincular una cuenta y no podrás cambiarla después.'),
      ).toBeInTheDocument()

      await user.click(checkbox)
      expect(commit).toBeEnabled()
    })

    it('enrolls the picked profile and drops straight into the feed', async () => {
      const user = userEvent.setup()
      const dialog = await openImportDialog(user)

      await user.type(await within(dialog).findByLabelText('Usuario de Instagram'), 'ana')
      await user.click(within(dialog).getByRole('button', { name: 'Buscar' }))
      await user.click(await within(dialog).findByRole('button', { name: '@la_tienda_de_ana' }))
      await user.click(await within(dialog).findByRole('checkbox'))
      await user.click(within(dialog).getByRole('button', { name: 'Vincular cuenta' }))

      await waitFor(() =>
        expect(enrollInstagram).toHaveBeenCalledWith('p1', 'la_tienda_de_ana'),
      )
      expect(await within(dialog).findByRole('button', { name: 'Blusa de lino' })).toBeInTheDocument()
    })

    it('lets the seller back out of the attestation to pick again', async () => {
      const user = userEvent.setup()
      const dialog = await openImportDialog(user)

      await user.type(await within(dialog).findByLabelText('Usuario de Instagram'), 'ana')
      await user.click(within(dialog).getByRole('button', { name: 'Buscar' }))
      await user.click(await within(dialog).findByRole('button', { name: '@la_tienda_de_ana' }))
      await user.click(await within(dialog).findByRole('button', { name: 'Cambiar' }))

      expect(
        await within(dialog).findByRole('button', { name: '@la_tienda_de_ana' }),
      ).toBeInTheDocument()
      expect(enrollInstagram).not.toHaveBeenCalled()
    })

    it('sends the seller back to the search box when the profile changed mid-selection', async () => {
      const user = userEvent.setup()
      vi.mocked(enrollInstagram).mockResolvedValue({ ok: false, reason: 'mismatch' })
      const dialog = await openImportDialog(user)

      await user.type(await within(dialog).findByLabelText('Usuario de Instagram'), 'ana')
      await user.click(within(dialog).getByRole('button', { name: 'Buscar' }))
      await user.click(await within(dialog).findByRole('button', { name: '@la_tienda_de_ana' }))
      await user.click(await within(dialog).findByRole('checkbox'))
      await user.click(within(dialog).getByRole('button', { name: 'Vincular cuenta' }))

      expect(await within(dialog).findByRole('alert')).toHaveTextContent(
        'Esa cuenta cambió mientras la seleccionabas. Búscala de nuevo.',
      )
      expect(await within(dialog).findByText('Escribe tu usuario de Instagram')).toBeInTheDocument()
    })
  })

  // An enrolled seller never sees the wizard again — the link is permanent and
  // the search endpoint closes with it.
  it('goes straight to the feed for an enrolled seller, without searching', async () => {
    const user = userEvent.setup()
    const dialog = await openImportDialog(user)

    expect(await within(dialog).findByRole('button', { name: 'Blusa de lino' })).toBeInTheDocument()
    expect(searchInstagramProfiles).not.toHaveBeenCalled()
    expect(within(dialog).queryByText('Escribe tu usuario de Instagram')).not.toBeInTheDocument()
  })

  // The API never returns the linked handle, so the UI has nothing to display
  // and must not invent one.
  it('never shows the linked handle back to the seller', async () => {
    const user = userEvent.setup()
    const dialog = await openImportDialog(user)

    await within(dialog).findByRole('button', { name: 'Blusa de lino' })
    expect(dialog).not.toHaveTextContent('la_tienda_de_ana')
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
    // The cap is the catalog's remaining space, not a per-import quota: one
    // item exists, so 24 of the 25 slots are still open.
    expect(
      within(dialog).getByText(`1 de ${MAX_CATALOG_ITEMS - mockItems.length} seleccionadas`),
    ).toBeInTheDocument()
  })

  /**
   * The import is bounded by the catalog, not by a quota of its own. A seller
   * gets one metered scraper run per cooldown, so anything they cannot select
   * now waits a week — the only defensible cap is "everything that still fits".
   */
  describe('catalog space', () => {
    /** `n` items, enough to fill any part of the catalog a test needs. */
    const filledWith = (n: number): Item[] =>
      Array.from({ length: n }, (_, i) => ({ ...mockItems[0], _id: `item${i}`, name: `Artículo ${i}` }))

    it('caps the selection at the slots left and says why it is short', async () => {
      const user = userEvent.setup()
      vi.mocked(fetchCatalogItems).mockResolvedValue(filledWith(MAX_CATALOG_ITEMS - 1))

      const dialog = await openImportDialog(user)

      expect(
        await within(dialog).findByText(
          new RegExp(`Puedes importar 1 foto: tu catálogo admite ${MAX_CATALOG_ITEMS} artículos`),
        ),
      ).toBeInTheDocument()

      await user.click(within(dialog).getByRole('button', { name: 'Blusa de lino' }))

      // The one remaining slot is spoken for, so the other photo stops taking
      // taps — the seller learns the bound here rather than from a 403.
      expect(within(dialog).getByRole('button', { name: 'Aretes de latón' })).toBeDisabled()
      expect(within(dialog).getByText('1 de 1 seleccionadas')).toBeInTheDocument()
    })

    // Opening the dialog is what spends the billed scraper run, so a catalog
    // with nowhere to put an item must not be able to open it at all.
    it('closes the entry point when the catalog is full', async () => {
      vi.mocked(fetchCatalogItems).mockResolvedValue(filledWith(MAX_CATALOG_ITEMS))

      renderPage()

      const openButton = await screen.findByRole('button', { name: 'Importar de Instagram' })
      expect(openButton).toBeDisabled()
      expect(
        screen.getByText(
          `Tu catálogo llegó al máximo de ${MAX_CATALOG_ITEMS} artículos. Elimina alguno para agregar o importar más.`,
        ),
      ).toBeInTheDocument()
      expect(fetchInstagramPosts).not.toHaveBeenCalled()
    })
  })

  it('imports the selection by externalPostId alone and refreshes the catalog items', async () => {
    const user = userEvent.setup()
    vi.mocked(importInstagramPosts).mockResolvedValue({
      ok: true,
      imported: [
        {
          externalPostId: 'c1',
          item: { _id: 'item_new', name: 'Blusa de lino', price: 0, imgPath: 'https://cdn/x.webp' },
        },
      ],
      skipped: [],
      nextAvailable: COOLDOWN_UNTIL,
    })

    const dialog = await openImportDialog(user)
    await user.click(await within(dialog).findByRole('button', { name: 'Blusa de lino' }))
    await user.click(within(dialog).getByRole('button', { name: /^Importar 1$/ }))

    await waitFor(() => expect(importInstagramPosts).toHaveBeenCalledWith([{ externalPostId: 'c1' }]))
    expect(
      await within(dialog).findByText('Se agregó 1 artículo a tu catálogo.'),
    ).toBeInTheDocument()
    // The grid behind the dialog re-reads its items to show the new product...
    await waitFor(() => expect(fetchCatalogItems).toHaveBeenCalledTimes(2))
    // ...but the Instagram feed is NOT re-read. That would cost a metered
    // scraper run to repaint a screen the seller is leaving.
    expect(fetchInstagramPosts).toHaveBeenCalledTimes(1)
  })

  // A clean import ends the session rather than returning to the picker.
  it('closes itself after a clean import', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    vi.mocked(importInstagramPosts).mockResolvedValue({
      ok: true,
      imported: [
        {
          externalPostId: 'c1',
          item: { _id: 'item_new', name: 'Blusa de lino', price: 0, imgPath: 'https://cdn/x.webp' },
        },
      ],
      skipped: [],
      nextAvailable: COOLDOWN_UNTIL,
    })

    const dialog = await openImportDialog(user)
    await user.click(await within(dialog).findByRole('button', { name: 'Blusa de lino' }))
    await user.click(within(dialog).getByRole('button', { name: /^Importar 1$/ }))

    await within(dialog).findByText('Se agregó 1 artículo a tu catálogo.')
    // No confirmation tap on the happy path.
    expect(within(dialog).queryByRole('button', { name: 'Listo' })).not.toBeInTheDocument()

    await vi.advanceTimersByTimeAsync(2500)
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Importar de Instagram' })).not.toBeInTheDocument(),
    )
    vi.useRealTimers()
  })

  it('reports partial success with a readable reason for each skipped post', async () => {
    const user = userEvent.setup()
    vi.mocked(importInstagramPosts).mockResolvedValue({
      ok: true,
      imported: [
        {
          externalPostId: 'c1',
          item: { _id: 'item_new', name: 'Blusa de lino', price: 0, imgPath: 'https://cdn/x.webp' },
        },
      ],
      skipped: [{ externalPostId: 'c2', reason: 'That post has no downloadable image' }],
      nextAvailable: COOLDOWN_UNTIL,
    })

    const dialog = await openImportDialog(user)
    await user.click(await within(dialog).findByRole('button', { name: 'Blusa de lino' }))
    await user.click(within(dialog).getByRole('button', { name: 'Aretes de latón' }))
    await user.click(within(dialog).getByRole('button', { name: /^Importar 2$/ }))

    expect(
      await within(dialog).findByText('Se agregó 1 artículo a tu catálogo.'),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByText('No pudimos descargar su imagen. Ábrelo de nuevo y vuelve a intentarlo.'),
    ).toBeInTheDocument()

    // A partial import must NOT close itself — the skipped list is the only
    // place those reasons appear, and it would vanish mid-read.
    expect(within(dialog).getByRole('button', { name: 'Listo' })).toBeInTheDocument()
    await new Promise((r) => setTimeout(r, 2500))
    expect(screen.getByRole('dialog', { name: 'Importar de Instagram' })).toBeInTheDocument()
  })

  it('sends the seller back to the search box when the feed says not enrolled', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchInstagramPosts).mockResolvedValue({ ok: false, reason: 'notEnrolled' })

    const dialog = await openImportDialog(user)

    expect(await within(dialog).findByText('Escribe tu usuario de Instagram')).toBeInTheDocument()
  })

  it('offers a retry when the catalog is full', async () => {
    const user = userEvent.setup()
    vi.mocked(importInstagramPosts).mockResolvedValue({ ok: false, reason: 'catalogFull' })

    const dialog = await openImportDialog(user)
    await user.click(await within(dialog).findByRole('button', { name: 'Blusa de lino' }))
    await user.click(within(dialog).getByRole('button', { name: /^Importar 1$/ }))

    const alert = await within(dialog).findByRole('alert')
    expect(alert).toHaveTextContent(
      `Tu catálogo llegó al máximo de ${MAX_CATALOG_ITEMS} artículos.`,
    )
  })

  /* --- The import cooldown ------------------------------------------------ */

  /**
   * Reading the feed is a billed Apify run, and the API allows one per seller
   * per cooldown. These cover the two halves of the guard: the client keeps the
   * seller off the billed call, and the client is honest about why.
   */
  describe('cooldown', () => {
    beforeEach(() => {
      vi.mocked(fetchInstagramStatus).mockResolvedValue(
        status({ enrolled: true, available: false, nextAvailable: COOLDOWN_UNTIL }),
      )
    })

    it('disables the catalog button and says when it comes back', async () => {
      renderPage()

      const openButton = await screen.findByRole('button', { name: 'Importar de Instagram' })
      await waitFor(() => expect(openButton).toBeDisabled())
      expect(screen.getByText(/Podrás importar de Instagram de nuevo el/)).toBeInTheDocument()
    })

    // The point of reading /status first: the dialog must not spend a billed run
    // to be told no. The API refuses it anyway — this keeps them off it.
    it('never fetches the feed while the seller is in cooldown', async () => {
      const user = userEvent.setup()
      renderPage()

      const openButton = await screen.findByRole('button', { name: 'Importar de Instagram' })
      await waitFor(() => expect(openButton).toBeDisabled())
      await user.click(openButton)

      expect(screen.queryByRole('dialog', { name: 'Importar de Instagram' })).not.toBeInTheDocument()
      expect(fetchInstagramPosts).not.toHaveBeenCalled()
    })

    // The cooldown can start in another tab, so a stale `available: true` has to
    // land somewhere other than a dead retry button.
    it('shows a terminal screen with no retry when the feed answers 429', async () => {
      const user = userEvent.setup()
      vi.mocked(fetchInstagramStatus).mockResolvedValue(status({ enrolled: true }))
      vi.mocked(fetchInstagramPosts).mockResolvedValue({
        ok: false, reason: 'cooldown', availableAt: COOLDOWN_UNTIL,
      })

      const dialog = await openImportDialog(user)

      expect(
        await within(dialog).findByText('Ya importaste de Instagram esta semana.'),
      ).toBeInTheDocument()
      expect(within(dialog).getByText(/una vez cada 7 días/)).toBeInTheDocument()
      expect(within(dialog).queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
    })
  })

  /* --- The cached status entry -------------------------------------------- */

  /**
   * `/instagram/status` is unmetered, but it was read three times per visit to
   * this screen: once by the grid, once more when the dialog opened, and once
   * again after an import. The grid and the dialog now share one cache entry,
   * and every server answer about the gate is written into it — so nothing
   * re-reads it to learn what it was just told.
   *
   * The gate itself is unchanged: it is still the API's 429 on the metered
   * routes. These only assert that the client stops asking twice.
   */
  describe('status caching', () => {
    it('reads the status once for the grid and the dialog together', async () => {
      const user = userEvent.setup()
      const dialog = await openImportDialog(user)

      await within(dialog).findByRole('button', { name: 'Blusa de lino' })
      expect(fetchInstagramStatus).toHaveBeenCalledTimes(1)
    })

    // The 201 carries `nextAvailable`. Asking /status afterwards would spend a
    // request to be told the date we are already holding.
    it("disables the catalog button from the import's own answer, with no second status read", async () => {
      const user = userEvent.setup()
      vi.mocked(importInstagramPosts).mockResolvedValue({
        ok: true,
        imported: [
          {
            externalPostId: 'c1',
            item: { _id: 'item_new', name: 'Blusa de lino', price: 0, imgPath: 'https://cdn/x.webp' },
          },
        ],
        // A skip keeps the dialog open, so the grid behind it can be inspected
        // without racing the clean-import auto-close.
        skipped: [{ externalPostId: 'c2', reason: 'Already imported' }],
        nextAvailable: COOLDOWN_UNTIL,
      })

      const dialog = await openImportDialog(user)
      await user.click(await within(dialog).findByRole('button', { name: 'Blusa de lino' }))
      await user.click(within(dialog).getByRole('button', { name: /^Importar 1$/ }))

      await within(dialog).findByText('Se agregó 1 artículo a tu catálogo.')

      const openButton = screen.getByRole('button', { name: 'Importar de Instagram' })
      await waitFor(() => expect(openButton).toBeDisabled())
      expect(fetchInstagramStatus).toHaveBeenCalledTimes(1)
    })

    // A cooldown that started in another tab arrives as a 429 on the feed. That
    // is news the button behind the dialog needs, and it needs it for free.
    it('records a 429 from the feed so the button behind the dialog goes stale', async () => {
      const user = userEvent.setup()
      vi.mocked(fetchInstagramPosts).mockResolvedValue({
        ok: false, reason: 'cooldown', availableAt: COOLDOWN_UNTIL,
      })

      const dialog = await openImportDialog(user)
      await within(dialog).findByText('Ya importaste de Instagram esta semana.')
      await user.click(within(dialog).getByRole('button', { name: 'Cerrar' }))

      const openButton = screen.getByRole('button', { name: 'Importar de Instagram' })
      await waitFor(() => expect(openButton).toBeDisabled())
      expect(screen.getByText(/Podrás importar de Instagram de nuevo el/)).toBeInTheDocument()
      expect(fetchInstagramStatus).toHaveBeenCalledTimes(1)
    })

    // Caching must not turn a courtesy read into a gate. A status read that
    // fails leaves the feature working — the API refuses if it must.
    it('leaves the feature enabled when the status read fails', async () => {
      vi.mocked(fetchInstagramStatus).mockRejectedValue(new Error('Red no disponible'))
      renderPage()

      const openButton = await screen.findByRole('button', { name: 'Importar de Instagram' })
      await waitFor(() => expect(fetchInstagramStatus).toHaveBeenCalled())
      expect(openButton).toBeEnabled()
    })
  })

  /**
   * Opening the dialog is the ONLY thing that reads the feed.
   *
   * There used to be an "Actualizar" button here. Re-reading is a billed scraper
   * run and it bought the seller nothing — the feed is already fetched fresh on
   * every open, and Instagram posts do not change between two taps. It was the
   * one gesture on the screen that cost money, so it is gone.
   */
  it('offers no way to re-read the feed once the dialog is open', async () => {
    const user = userEvent.setup()
    const dialog = await openImportDialog(user)

    await within(dialog).findByRole('button', { name: 'Blusa de lino' })
    expect(within(dialog).queryByRole('button', { name: 'Actualizar' })).not.toBeInTheDocument()
    expect(fetchInstagramPosts).toHaveBeenCalledTimes(1)
  })

  // The seller gets one pass per cooldown, so they have to know that while they
  // are still choosing — not on the screen that follows the choice.
  it('warns that importing is once per cooldown before anything is selected', async () => {
    const user = userEvent.setup()
    const dialog = await openImportDialog(user)

    expect(
      await within(dialog).findByText('Solo puedes importar una vez cada 7 días.'),
    ).toBeInTheDocument()
    expect(within(dialog).getByText(/las que dejes fuera tendrán que esperar/)).toBeInTheDocument()
  })

  // Every skip reason is fixed by refetching the feed, and a successful import
  // is exactly what blocks that refetch. Telling the seller to try again would
  // be an instruction the API refuses.
  it('replaces "try again" with the date when a partial import started a cooldown', async () => {
    const user = userEvent.setup()
    vi.mocked(importInstagramPosts).mockResolvedValue({
      ok: true,
      imported: [
        {
          externalPostId: 'c1',
          item: { _id: 'item_new', name: 'Blusa de lino', price: 0, imgPath: 'https://cdn/x.webp' },
        },
      ],
      skipped: [{ externalPostId: 'c2', reason: 'That post has no downloadable image' }],
      nextAvailable: COOLDOWN_UNTIL,
    })

    const dialog = await openImportDialog(user)
    await user.click(await within(dialog).findByRole('button', { name: 'Blusa de lino' }))
    await user.click(within(dialog).getByRole('button', { name: 'Aretes de latón' }))
    await user.click(within(dialog).getByRole('button', { name: /^Importar 2$/ }))

    expect(await within(dialog).findByText(/Podrás volver a intentarlo el/)).toBeInTheDocument()
    expect(
      within(dialog).queryByText(/Vuelve a abrir .Importar de Instagram./),
    ).not.toBeInTheDocument()
  })
})
