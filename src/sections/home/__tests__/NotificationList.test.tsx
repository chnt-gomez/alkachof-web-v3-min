import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { NotificationList } from '../components/NotificationList'
import type { Notification } from '@/sections/notifications/actions/fetchNotifications'

const sample = (overrides: Partial<Notification> = {}): Notification => ({
  _id: 'n1',
  userId: 'me',
  message: 'Rebozos Oaxaca: ¡Nuevos rebozos ya disponibles!',
  metadata: { navigationUrl: '/catalog/cat1' },
  createdOn: new Date().toISOString(),
  seenOn: false,
  ...overrides,
})

function renderList(notifications: Notification[]) {
  const onSeen = vi.fn()
  const onDelete = vi.fn()
  render(
    <MemoryRouter>
      <NotificationList notifications={notifications} onSeen={onSeen} onDelete={onDelete} />
    </MemoryRouter>,
  )
  return { onSeen, onDelete }
}

const trashFor = (notification: Notification) =>
  screen.getByRole('button', { name: `Eliminar notificación: ${notification.message}` })

describe('NotificationList', () => {
  it('renders the empty state with no trash buttons', () => {
    renderList([])

    expect(screen.getByText('Nada por el momento')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('gives every row its own trash button, whatever its kind', () => {
    const linkable = sample({ _id: 'n1', message: 'Broadcast' })
    const unreadInfo = sample({ _id: 'n2', message: 'Informativa', metadata: { navigationUrl: null } })
    const seenInfo = sample({
      _id: 'n3',
      message: 'Ya leída',
      metadata: { navigationUrl: null },
      seenOn: true,
    })
    renderList([linkable, unreadInfo, seenInfo])

    expect(trashFor(linkable)).toBeInTheDocument()
    expect(trashFor(unreadInfo)).toBeInTheDocument()
    expect(trashFor(seenInfo)).toBeInTheDocument()
  })

  it('deletes the row it belongs to without navigating or marking it seen', async () => {
    const notification = sample()
    const { onSeen, onDelete } = renderList([notification])

    await userEvent.setup().click(trashFor(notification))

    expect(onDelete).toHaveBeenCalledExactlyOnceWith('n1')
    expect(onSeen).not.toHaveBeenCalled()
  })

  it('keeps the trash button outside the navigating link, not nested inside it', () => {
    const notification = sample()
    renderList([notification])

    // A button nested in a link is invalid markup and would fire the link's
    // navigation too — the delete affordance must be a sibling of it.
    const link = screen.getByRole('link')
    expect(within(link).queryByRole('button')).not.toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/catalog/cat1')
  })

  it('still marks a notification seen when its row (not the trash) is clicked', async () => {
    const notification = sample({ metadata: { navigationUrl: null } })
    const { onSeen, onDelete } = renderList([notification])

    await userEvent.setup().click(screen.getByRole('button', { name: 'Marcar como leída' }))

    expect(onSeen).toHaveBeenCalledExactlyOnceWith('n1')
    expect(onDelete).not.toHaveBeenCalled()
  })
})
