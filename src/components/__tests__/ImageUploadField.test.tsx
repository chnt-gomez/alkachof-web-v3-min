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

  it('rejects files larger than 5 MB with a Spanish error', async () => {
    const user = userEvent.setup()
    const upload = vi.fn()
    const onChange = vi.fn()

    render(<ImageUploadField value="" onChange={onChange} upload={upload} />)

    await user.click(screen.getByRole('button', { name: /agregar imagen/i }))
    const big = new File([new Uint8Array(6 * 1024 * 1024)], 'big.png', { type: 'image/png' })
    await user.upload(getGalleryInput(), big)

    expect(await screen.findByRole('alert')).toHaveTextContent(/tamaño máximo/i)
    expect(upload).not.toHaveBeenCalled()
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
