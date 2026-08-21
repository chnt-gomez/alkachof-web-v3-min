import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ImageUploadField } from '../ImageUploadField'

function getGalleryInput(): HTMLInputElement {
  return document.querySelector('input[type="file"]:not([capture])') as HTMLInputElement
}

describe('ImageUploadField', () => {
  it('uploads a valid image and surfaces the returned URL', async () => {
    const user = userEvent.setup()
    const upload = vi.fn().mockResolvedValue('https://example.com/uploaded.png')
    const onChange = vi.fn()

    render(<ImageUploadField value="" onChange={onChange} upload={upload} />)

    await user.click(screen.getByRole('button', { name: /agregar imagen/i }))
    const file = new File(['hello'], 'foto.png', { type: 'image/png' })
    await user.upload(getGalleryInput(), file)

    await waitFor(() => expect(upload).toHaveBeenCalledWith(file))
    expect(onChange).toHaveBeenCalledWith('https://example.com/uploaded.png')
  })

  it('hands the file to the parent and previews it when no upload is given', async () => {
    const user = userEvent.setup()
    const onFileSelect = vi.fn()
    const onChange = vi.fn()

    render(<ImageUploadField value="" onChange={onChange} onFileSelect={onFileSelect} />)

    await user.click(screen.getByRole('button', { name: /agregar imagen/i }))
    const file = new File(['hello'], 'foto.png', { type: 'image/png' })
    await user.upload(getGalleryInput(), file)

    await waitFor(() => expect(onFileSelect).toHaveBeenCalledWith(file))
    expect(onChange).toHaveBeenCalledWith(expect.stringContaining('blob:'))
  })

  it('rejects unsupported file types with a Spanish error', async () => {
    const user = userEvent.setup()
    const upload = vi.fn()
    const onChange = vi.fn()

    render(<ImageUploadField value="" onChange={onChange} upload={upload} />)

    await user.click(screen.getByRole('button', { name: /agregar imagen/i }))
    const bad = new File(['x'], 'doc.pdf', { type: 'application/pdf' })
    fireEvent.change(getGalleryInput(), { target: { files: [bad] } })

    expect(await screen.findByRole('alert')).toHaveTextContent(/formato no admitido/i)
    expect(upload).not.toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
  })

  // 10 MB matches the API's multer limit; anything under it must reach the server.
  it('rejects files larger than 10 MB with a Spanish error', async () => {
    const user = userEvent.setup()
    const upload = vi.fn()
    const onChange = vi.fn()

    render(<ImageUploadField value="" onChange={onChange} upload={upload} />)

    await user.click(screen.getByRole('button', { name: /agregar imagen/i }))
    const big = new File([new Uint8Array(11 * 1024 * 1024)], 'big.png', { type: 'image/png' })
    await user.upload(getGalleryInput(), big)

    expect(await screen.findByRole('alert')).toHaveTextContent(/tamaño máximo de 10 MB/i)
    expect(upload).not.toHaveBeenCalled()
  })

  // The API's fileFilter rejects WebP and surfaces it as an opaque 500, so the
  // client has to catch it first — see followup.CatalogImageApi.md.
  it('rejects WebP up front instead of letting the server 500', async () => {
    const user = userEvent.setup()
    const upload = vi.fn()
    const onChange = vi.fn()

    render(<ImageUploadField value="" onChange={onChange} upload={upload} />)

    await user.click(screen.getByRole('button', { name: /agregar imagen/i }))
    const webp = new File(['x'], 'foto.webp', { type: 'image/webp' })
    fireEvent.change(getGalleryInput(), { target: { files: [webp] } })

    expect(await screen.findByRole('alert')).toHaveTextContent('Formato no admitido. Usa JPG o PNG.')
    expect(upload).not.toHaveBeenCalled()
  })

  it('shows no remove control unless onDelete is given', async () => {
    render(<ImageUploadField value="https://example.com/old.png" onChange={vi.fn()} upload={vi.fn()} />)

    expect(screen.queryByRole('button', { name: /quitar imagen/i })).not.toBeInTheDocument()
  })

  it('hides the remove control when there is no image to remove', async () => {
    render(
      <ImageUploadField
        value=""
        onChange={vi.fn()}
        upload={vi.fn()}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    expect(screen.queryByRole('button', { name: /quitar imagen/i })).not.toBeInTheDocument()
  })

  it('calls onDelete from the remove control and surfaces its failure', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn().mockRejectedValue(new Error('No eres el dueño'))

    render(
      <ImageUploadField
        value="https://example.com/old.png"
        onChange={vi.fn()}
        upload={vi.fn()}
        onDelete={onDelete}
      />,
    )

    await user.click(screen.getByRole('button', { name: /quitar imagen/i }))

    await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1))
    expect(await screen.findByRole('alert')).toHaveTextContent('No eres el dueño')
  })

  it('preserves the previous image and shows an error when upload fails', async () => {
    const user = userEvent.setup()
    const upload = vi.fn().mockRejectedValue(new Error('Red caída'))
    const onChange = vi.fn()

    render(
      <ImageUploadField
        value="https://example.com/old.png"
        onChange={onChange}
        upload={upload}
      />,
    )

    await user.click(screen.getByRole('button', { name: /cambiar imagen/i }))
    const file = new File(['x'], 'foto.png', { type: 'image/png' })
    await user.upload(getGalleryInput(), file)

    expect(await screen.findByRole('alert')).toHaveTextContent('Red caída')
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/old.png')
  })
})
