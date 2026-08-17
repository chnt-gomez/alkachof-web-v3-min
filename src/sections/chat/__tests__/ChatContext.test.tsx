import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/sections/auth/AuthContext'
import { emitLiveEvent, type LiveChatMessage } from '@/lib/liveEvents'
import { ChatProvider } from '../context/ChatContext'
import { useChat } from '../useChat'
import type { Chat } from '../types'

vi.mock('@/sections/auth/actions/fetchProfile')
vi.mock('../actions/chatApi', () => ({
  fetchRecentChats: vi.fn(),
  fetchChatMessages: vi.fn(),
  sendChatMessage: vi.fn(),
  createChat: vi.fn(),
}))

import { fetchProfile } from '@/sections/auth/actions/fetchProfile'
import { fetchRecentChats } from '../actions/chatApi'

const MY_ID = 'me'
const OTHER_ID = 'other'
const CHAT_ID = 'chat1'

const existingChat: Chat = {
  _id: CHAT_ID,
  users: [MY_ID, OTHER_ID],
  createdOn: new Date().toISOString(),
  status: 'active',
}

const liveMessage = (overrides: Partial<LiveChatMessage> = {}): LiveChatMessage => ({
  _id: 'm1',
  chatId: CHAT_ID,
  sender: OTHER_ID,
  message: 'Hola, ¿sigue disponible?',
  sent: new Date().toISOString(),
  ...overrides,
})

// Exposes the thread body + unread count so assertions target real provider state.
function Probe() {
  const { messagesFor, unreadCount, status } = useChat()
  const messages = messagesFor(CHAT_ID)
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="unread">{unreadCount}</span>
      <ul>
        {messages.map((m) => (
          <li key={m._id} data-testid="msg">
            {m.type}:{m.message}
          </li>
        ))}
      </ul>
    </div>
  )
}

function renderProvider() {
  return render(
    <AuthProvider>
      <ChatProvider>
        <Probe />
      </ChatProvider>
    </AuthProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.setItem('alk.token', 'test-token')
  vi.mocked(fetchProfile).mockResolvedValue({ _id: 'p1', userId: MY_ID, alias: 'Yo' })
  vi.mocked(fetchRecentChats).mockResolvedValue([existingChat])
})

afterEach(() => {
  localStorage.clear()
})

describe('ChatProvider live delivery', () => {
  it('renders an incoming chat:message and bumps the unread count', async () => {
    renderProvider()
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'))

    act(() => {
      emitLiveEvent('chatMessage', liveMessage())
    })

    // The message renders live (reactivity) as an incoming bubble, and the
    // conversation is flagged unread.
    expect(await screen.findByTestId('msg')).toHaveTextContent('incoming:Hola, ¿sigue disponible?')
    expect(screen.getByTestId('unread')).toHaveTextContent('1')
  })

  it('does not mark our own echoed message unread and stamps it outgoing', async () => {
    renderProvider()
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'))

    act(() => {
      emitLiveEvent('chatMessage', liveMessage({ sender: MY_ID, message: 'Sí, disponible' }))
    })

    expect(await screen.findByTestId('msg')).toHaveTextContent('outgoing:Sí, disponible')
    expect(screen.getByTestId('unread')).toHaveTextContent('0')
  })

  it('pulls a brand-new conversation into the inbox via a re-sync', async () => {
    renderProvider()
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'))
    expect(fetchRecentChats).toHaveBeenCalledTimes(1)

    // A message for a chat we do not know yet triggers a fresh /chat/recent sync.
    act(() => {
      emitLiveEvent('chatMessage', liveMessage({ _id: 'm2', chatId: 'unknownChat' }))
    })

    await waitFor(() => expect(fetchRecentChats).toHaveBeenCalledTimes(2))
  })
})
