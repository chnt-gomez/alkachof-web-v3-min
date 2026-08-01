import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@/components/ui/toast'
import { ApiError } from '@/lib/api'
import { AuthProvider } from '@/sections/auth/AuthContext'
import { NavShell } from '@/components/NavShell'
import { NotificationsProvider } from '../context/NotificationsContext'
import { useNotifications } from '../useNotifications'
import type { Notification } from '../actions/fetchNotifications'
import type { LiveSocketHandlers } from '../liveSocket'

vi.mock('@/sections/auth/actions/fetchProfile')
vi.mock('../liveSocket')
vi.mock('../actions/fetchNotifications', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../actions/fetchNotifications')>()),
  fetchNotifications: vi.fn(),
  fetchAllNotifications: vi.fn(),
  markNotificationSeen: vi.fn(),
}))

import { fetchProfile } from '@/sections/auth/actions/fetchProfile'
import { connectLiveSocket } from '../liveSocket'
import { fetchNotifications, markNotificationSeen } from '../actions/fetchNotifications'

const sampleNotification = (overrides: Partial<Notification> = {}): Notification => ({
  _id: 'n1',
  userId: 'me',
  message: 'Rebozos Oaxaca: ¡Nuevos rebozos ya disponibles!',
  metadata: { navigationUrl: '/catalog/cat1' },
  createdOn: new Date().toISOString(),
  seenOn: false,
  ...overrides,
})

// Minimal consumer exposing the provider state so assertions target real
// provider behavior (list contents, mark-seen) without a full page.
function Probe() {
  const { notifications, status, markSeen } = useNotifications()
  return (
    <div>
      <span data-testid="status">{status}</span>
      <ul>
        {notifications.map((n) => (
          <li key={n._id}>
            <button onClick={() => markSeen(n._id)}>{n.message}</button>
          </li>
        ))}
      </ul>
    </div>
  )
}

// NavShell rides along to cover the bell badge, which reads the same provider.
function renderWithProviders() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <ToastProvider>
        <AuthProvider>
          <NotificationsProvider>
            <Routes>
              <Route element={<NavShell />}>
                <Route path="/" element={<Probe />} />
              </Route>
            </Routes>
          </NotificationsProvider>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

let liveHandlers: LiveSocketHandlers | undefined

async function connectedHandlers(): Promise<LiveSocketHandlers> {
  await waitFor(() => expect(connectLiveSocket).toHaveBeenCalled())
  return liveHandlers!
}

beforeEach(() => {
  vi.clearAllMocks()
  liveHandlers = undefined
  localStorage.setItem('alk.token', 'test-token')
  vi.mocked(fetchProfile).mockResolvedValue({ _id: 'p1', userId: 'me', alias: 'Yo' })
  vi.mocked(fetchNotifications).mockResolvedValue([])
  vi.mocked(connectLiveSocket).mockImplementation((handlers) => {
    liveHandlers = handlers
    return () => {}
  })
})

afterEach(() => {
  localStorage.clear()
})

describe('NotificationsProvider', () => {
  it('fetches on login and shows the unread count in the bell badge', async () => {
    vi.mocked(fetchNotifications).mockResolvedValue([
      sampleNotification({ _id: 'n1', seenOn: false }),
      sampleNotification({ _id: 'n2', seenOn: true }),
    ])
    renderWithProviders()

    expect(await screen.findByLabelText('Notificaciones, 1 sin leer')).toBeInTheDocument()
  })

  it('does not fetch or open the socket when logged out', async () => {
    localStorage.clear()
    renderWithProviders()

    expect(await screen.findByRole('link', { name: 'Ingresar' })).toBeInTheDocument()
    expect(fetchNotifications).not.toHaveBeenCalled()
    expect(connectLiveSocket).not.toHaveBeenCalled()
  })

  it('prepends a live notification, bumps the badge and toasts the message', async () => {
    renderWithProviders()
    const handlers = await connectedHandlers()
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'))

    const live = sampleNotification({ _id: 'live1', message: 'Café de Altura: cosecha nueva ☕' })
    act(() => {
      handlers.onNotification(live)
    })

    // Rendered in the list and toasted.
    expect(screen.getByRole('alert')).toHaveTextContent('Café de Altura: cosecha nueva ☕')
    expect(screen.getByRole('button', { name: 'Café de Altura: cosecha nueva ☕' })).toBeInTheDocument()
    expect(screen.getByLabelText('Notificaciones, 1 sin leer')).toBeInTheDocument()
  })

  it('re-syncs from REST on socket (re)connect', async () => {
    renderWithProviders()
    const handlers = await connectedHandlers()
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'))

    vi.mocked(fetchNotifications).mockResolvedValue([
      sampleNotification({ _id: 'missed', message: 'Notificación perdida recuperada' }),
    ])
    await act(async () => {
      handlers.onConnect()
    })

    expect(
      await screen.findByRole('button', { name: 'Notificación perdida recuperada' }),
    ).toBeInTheDocument()
  })

  it('marks a notification as seen and clears the badge', async () => {
    const notification = sampleNotification()
    vi.mocked(fetchNotifications).mockResolvedValue([notification])
    vi.mocked(markNotificationSeen).mockResolvedValue({ ...notification, seenOn: true })
    renderWithProviders()

    await userEvent.setup().click(await screen.findByRole('button', { name: notification.message }))

    await waitFor(() =>
      expect(screen.getByLabelText('Notificaciones')).toBeInTheDocument(),
    )
    expect(markNotificationSeen).toHaveBeenCalledWith('n1')
  })

  it('drops a notification the server no longer knows (404) on mark-seen', async () => {
    const notification = sampleNotification()
    vi.mocked(fetchNotifications).mockResolvedValue([notification])
    vi.mocked(markNotificationSeen).mockRejectedValue(new ApiError('No encontrada', 404))
    renderWithProviders()

    await userEvent.setup().click(await screen.findByRole('button', { name: notification.message }))

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: notification.message })).not.toBeInTheDocument(),
    )
  })
})
