import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ImageUploadField } from '../ImageUploadField'
import { resizeImage } from '@/lib/resizeImage'

// Held open by hand so the intermediate phase can actually be observed — a real
// resize resolves in one tick under jsdom and would never be visible.
vi.mock('@/lib/resizeImage', () => ({ resizeImage: vi.fn() }))

function getGalleryInput(): HTMLInputElement {
  return document.querySelector('input[type="file"]:not([capture])') as HTMLInputElement
}

const png = () => new File(['bytes'], 'foto.png', { type: 'image/png' })

/** Lets a test hold the resize open, then release it. */
function deferredResize() {
  let release!: (file: File) => void
  vi.mocked(resizeImage).mockImplementation(
    () => new Promise<File>((resolve) => { release = resolve }),
  )
  return { release: () => release(png()) }
}

async function pick(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /agregar imagen/i }))
  fireEvent.change(getGalleryInput(), { target: { files: [png()] } })
}

describe('ImageUploadField — optimizing phase', () => {
  beforeEach(() => {
    vi.mocked(resizeImage).mockReset()
  })

  it('tells the user the image is being optimized', async () => {
    const user = userEvent.setup()
    const { release } = deferredResize()

    render(<ImageUploadField value="" onChange={vi.fn()} upload={vi.fn()} preset="products" />)
    await pick(user)

    expect(await screen.findByRole('status')).toHaveTextContent('Optimizando imagen para internet…')

    release()
    await waitFor(() =>
      expect(screen.queryByText('Optimizando imagen para internet…')).not.toBeInTheDocument(),
    )
  })

  it('reports busy while optimizing and settles when done', async () => {
    const user = userEvent.setup()
    const onBusyChange = vi.fn()
    const { release } = deferredResize()

    render(
      <ImageUploadField
        value=""
        onChange={vi.fn()}
        onFileSelect={vi.fn()}
        onBusyChange={onBusyChange}
        preset="products"
      />,
    )
    await pick(user)

    await waitFor(() => expect(onBusyChange).toHaveBeenCalledWith(true))

    release()
    await waitFor(() => expect(onBusyChange).toHaveBeenLastCalledWith(false))
  })

  it('does not hand the file to the parent until it is optimized', async () => {
    const user = userEvent.setup()
    const onFileSelect = vi.fn()
    const { release } = deferredResize()

    render(
      <ImageUploadField value="" onChange={vi.fn()} onFileSelect={onFileSelect} preset="products" />,
    )
    await pick(user)

    await screen.findByRole('status')
    expect(onFileSelect).not.toHaveBeenCalled()

    release()
    await waitFor(() => expect(onFileSelect).toHaveBeenCalled())
  })

  it('keeps the picker disabled while optimizing', async () => {
    const user = userEvent.setup()
    const { release } = deferredResize()

    render(<ImageUploadField value="" onChange={vi.fn()} upload={vi.fn()} preset="products" />)
    await pick(user)

    await screen.findByRole('status')
    expect(screen.getByRole('button', { name: /imagen/i })).toBeDisabled()

    release()
    await waitFor(() => expect(screen.getByRole('button', { name: /imagen/i })).toBeEnabled())
  })

  // resizeImage is contracted never to throw, so this guards against a future
  // change stranding the pick: the phase must clear and the original must still
  // be sent, since the server re-encodes whatever it receives.
  it('falls back to the original and unblocks if optimizing fails', async () => {
    const user = userEvent.setup()
    const onBusyChange = vi.fn()
    const upload = vi.fn().mockResolvedValue('https://cdn.test/foto.webp')
    vi.mocked(resizeImage).mockRejectedValue(new Error('boom'))

    render(
      <ImageUploadField
        value=""
        onChange={vi.fn()}
        upload={upload}
        onBusyChange={onBusyChange}
        preset="products"
      />,
    )
    await pick(user)

    await waitFor(() => expect(upload).toHaveBeenCalled())
    // The unblock lands when the upload settles, which is a tick after it is
    // called — asserting it straight after the call above is a race that only
    // passes while the suite is fast enough.
    await waitFor(() => expect(onBusyChange).toHaveBeenLastCalledWith(false))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
