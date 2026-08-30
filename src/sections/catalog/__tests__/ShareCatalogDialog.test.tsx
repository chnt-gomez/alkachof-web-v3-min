import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ShareCatalogDialog } from '../components/ShareCatalogDialog'
import { ToastProvider } from '@/components/ui/toast'

const CATALOG_ID = '6a0365fdf74fdcb617a8a5b6'

function renderDialog(onClose = vi.fn()) {
  render(
    <ToastProvider>
      <ShareCatalogDialog catalogId={CATALOG_ID} catalogName="Dulces Lupita" onClose={onClose} />
    </ToastProvider>,
  )
  return onClose
}

/** The link the button is expected to put on the clipboard. */
function expectedUrl() {
  return screen.getByText(new RegExp(`/join\\?catalogId=${CATALOG_ID}`)).textContent
}

describe('ShareCatalogDialog — copy link', () => {
  let execCommand: ReturnType<typeof vi.fn>

  beforeEach(() => {
    execCommand = vi.fn(() => true)
    Object.defineProperty(document, 'execCommand', { value: execCommand, configurable: true })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    Reflect.deleteProperty(navigator, 'share')
  })

  it('copies over plain http, where navigator.clipboard does not exist', async () => {
    // The insecure-context case: no async clipboard, no Web Share. This is the
    // configuration that silently claimed success while copying nothing.
    vi.stubGlobal('navigator', { ...navigator, clipboard: undefined, share: undefined })

    renderDialog()
    await userEvent.click(screen.getByRole('button', { name: /copiar link/i }))

    expect(execCommand).toHaveBeenCalledWith('copy')
    expect(await screen.findByText(/link copiado al portapapeles/i)).toBeInTheDocument()
  })

  it('copies before opening the share sheet', async () => {
    // Ordering is the fix: the clipboard write has to complete before the sheet
    // takes focus, or Firefox rejects it.
    const order: string[] = []
    execCommand.mockImplementation(() => {
      order.push('copy')
      return true
    })
    const share = vi.fn(() => {
      order.push('share')
      return Promise.resolve()
    })
    vi.stubGlobal('navigator', { ...navigator, share })

    const onClose = renderDialog()
    await userEvent.click(screen.getByRole('button', { name: /copiar link/i }))

    expect(order).toEqual(['copy', 'share'])
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: expectedUrl() }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('still leaves the link copied when the share sheet is dismissed', async () => {
    const share = vi.fn(() => Promise.reject(new Error('AbortError')))
    vi.stubGlobal('navigator', { ...navigator, share })

    const onClose = renderDialog()
    await userEvent.click(screen.getByRole('button', { name: /copiar link/i }))

    expect(execCommand).toHaveBeenCalledWith('copy')
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('falls back to the async clipboard when execCommand refuses', async () => {
    execCommand.mockReturnValue(false)
    const writeText = vi.fn(() => Promise.resolve())
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText }, share: undefined })

    renderDialog()
    await userEvent.click(screen.getByRole('button', { name: /copiar link/i }))

    expect(writeText).toHaveBeenCalledWith(expectedUrl())
    expect(await screen.findByText(/link copiado al portapapeles/i)).toBeInTheDocument()
  })

  it('reports failure and stays open when nothing can copy', async () => {
    execCommand.mockReturnValue(false)
    vi.stubGlobal('navigator', { ...navigator, clipboard: undefined, share: undefined })

    const onClose = renderDialog()
    await userEvent.click(screen.getByRole('button', { name: /copiar link/i }))

    expect(await screen.findByText(/no pudimos copiar el link/i)).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    // The link is on screen, so a manual copy is still possible.
    expect(expectedUrl()).toContain(CATALOG_ID)
  })
})
