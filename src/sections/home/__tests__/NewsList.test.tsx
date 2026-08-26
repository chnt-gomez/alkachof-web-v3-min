import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { NewsList } from '../components/NewsList'
import type { AdminMessage } from '../actions/fetchNews'

const sample = (overrides: Partial<AdminMessage> = {}): AdminMessage => ({
  _id: 'a1',
  date: new Date().toISOString(),
  title: 'Mantenimiento programado',
  message: 'El servicio estará intermitente el domingo.',
  ...overrides,
})

describe('NewsList', () => {
  it('renders the empty state', () => {
    render(<NewsList news={[]} />)

    expect(screen.getByText('No hay noticias por el momento')).toBeInTheDocument()
  })

  // An announcement is one global row shared by every user — there is no
  // per-user copy to remove. A trash button here would destroy it for everyone,
  // so the card must never grow one while announcements stay global. The rows
  // look like notification rows, which is exactly why this is easy to get wrong.
  it('offers no delete affordance, unlike the notification rows it resembles', () => {
    const news = [sample({ _id: 'a1', title: 'Primera' }), sample({ _id: 'a2', title: 'Segunda' })]
    render(<NewsList news={news} />)

    expect(screen.queryByRole('button', { name: /eliminar/i })).not.toBeInTheDocument()
    // Every row's only button is the row itself (opens the detail dialog).
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })

  it('opens the detail dialog when a row is tapped', async () => {
    render(<NewsList news={[sample({ title: 'Mantenimiento programado' })]} />)

    await userEvent.setup().click(screen.getByRole('button', { name: /Mantenimiento programado/ }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })
})
