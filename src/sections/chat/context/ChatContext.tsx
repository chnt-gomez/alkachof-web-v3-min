import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '@/sections/auth/useAuth'
import { onLiveEvent, type LiveChatMessage } from '@/lib/liveEvents'
import { fetchRecentChats, fetchChatMessages, sendChatMessage, createChat } from '../actions/chatApi'
import { fetchUserSummaries } from '../actions/fetchUserSummaries'
import type { Chat, ChatMessage, UserSummary } from '../types'
import { ChatContext, type ChatState, type ChatStatus } from '../chatContextValue'

/**
 * App-wide chat store. REST is the source of truth (`/chat/recent` +
 * `/{chatId}/messages`); sending is a REST POST rendered optimistically. Mounted
 * once inside `AuthProvider`; loads on login, clears on logout.
 *
 * Live delivery rides the shared `/live` socket (the same one notifications
 * owns) via the live-event bus (`@/lib/liveEvents`): the server emits
 * `chat:message` to both members and we subscribe here — no second connection.
 * The socket is best-effort; history recovers everything on load, so offline
 * members lose nothing. An incoming message from an unknown chat triggers a
 * `syncChats` so a brand-new conversation shows up in the inbox immediately.
 */
export function ChatProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, profile } = useAuth()
  const myUserId = profile?.userId ?? ''

  const [chats, setChats] = useState<Chat[]>([])
  const [status, setStatus] = useState<ChatStatus>('loading')
  const [summaries, setSummaries] = useState<Record<string, UserSummary>>({})
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({})
  const [threadStatus, setThreadStatus] = useState<Record<string, ChatStatus>>({})
  const [unread, setUnread] = useState<Set<string>>(new Set())

  // The counterparty is whichever member id is not mine. In dev the mock
  // profile id is random, so this may fall back to the first member — harmless,
  // since summaries resolve a friendly name for any id.
  const counterpartyId = useCallback(
    (chat: Chat) => chat.users.find((u) => u !== myUserId) ?? chat.users[0],
    [myUserId],
  )

  const resolveSummaries = useCallback(async (ids: string[]) => {
    const unique = Array.from(new Set(ids)).filter(Boolean)
    if (unique.length === 0) return
    try {
      const resolved = await fetchUserSummaries(unique)
      setSummaries((prev) => ({ ...prev, ...resolved }))
    } catch {
      // Names are best-effort; the UI falls back to a placeholder without them.
    }
  }, [])

  const syncChats = useCallback(async () => {
    try {
      const list = await fetchRecentChats()
      setChats(list)
      setStatus('ready')
      void resolveSummaries(list.map((c) => counterpartyId(c)))
    } catch {
      setStatus((prev) => (prev === 'ready' ? prev : 'error'))
    }
  }, [counterpartyId, resolveSummaries])

  const reload = useCallback(() => {
    setStatus('loading')
    void syncChats()
  }, [syncChats])

  // Insert or replace a message by `_id` so a socket echo of our own send is a
  // no-op rather than a duplicate bubble (the server echoes to the sender too).
  const upsertMessage = useCallback((chatId: string, msg: ChatMessage) => {
    setMessages((prev) => {
      const existing = prev[chatId] ?? []
      const next = existing.some((m) => m._id === msg._id)
        ? existing.map((m) => (m._id === msg._id ? msg : m))
        : [...existing, msg]
      return { ...prev, [chatId]: next }
    })
  }, [])

  // Keep the live-message handler stable while reading the latest chat list and
  // identity, so we subscribe to the bus once per session rather than resubscribe
  // on every chats/profile change.
  const chatsRef = useRef(chats)
  chatsRef.current = chats
  const myUserIdRef = useRef(myUserId)
  myUserIdRef.current = myUserId

  const receiveLiveMessage = useCallback(
    (raw: LiveChatMessage) => {
      const mine = raw.sender === myUserIdRef.current
      // The socket payload omits `type` — compute it from the sender.
      const msg: ChatMessage = { ...raw, type: mine ? 'outgoing' : 'incoming' }
      upsertMessage(msg.chatId, msg)
      // A message from the other member marks the thread unread; the open thread
      // clears it again on view (ChatThreadPage). Our own echoes never do.
      if (!mine) {
        setUnread((prev) => {
          const next = new Set(prev)
          next.add(msg.chatId)
          return next
        })
      }
      // First message of a conversation we do not know yet — pull it into the
      // inbox so it appears without a manual reload.
      if (!chatsRef.current.some((c) => c._id === msg.chatId)) {
        void syncChats()
      }
    },
    [upsertMessage, syncChats],
  )

  useEffect(() => {
    if (!isAuthenticated) {
      setChats([])
      setStatus('loading')
      setSummaries({})
      setMessages({})
      setThreadStatus({})
      setUnread(new Set())
      return
    }
    void syncChats()
    // Subscribe to the shared /live bus: new messages, and a re-sync on every
    // (re)connect so a reconnecting tab recovers anything missed while offline.
    const offMessage = onLiveEvent('chatMessage', receiveLiveMessage)
    const offConnect = onLiveEvent('connect', () => {
      void syncChats()
    })
    return () => {
      offMessage()
      offConnect()
    }
  }, [isAuthenticated, syncChats, receiveLiveMessage])

  const loadMessages = useCallback(async (chatId: string) => {
    setThreadStatus((prev) => ({ ...prev, [chatId]: 'loading' }))
    try {
      const list = await fetchChatMessages(chatId)
      setMessages((prev) => ({ ...prev, [chatId]: list }))
      setThreadStatus((prev) => ({ ...prev, [chatId]: 'ready' }))
    } catch {
      setThreadStatus((prev) => ({ ...prev, [chatId]: 'error' }))
    }
  }, [])

  const sendMessage = useCallback(
    async (chatId: string, text: string) => {
      const body = text.trim()
      if (!body) return
      const sent = await sendChatMessage(chatId, body)
      upsertMessage(chatId, sent)
    },
    [upsertMessage],
  )

  const markChatRead = useCallback((chatId: string) => {
    setUnread((prev) => {
      if (!prev.has(chatId)) return prev
      const next = new Set(prev)
      next.delete(chatId)
      return next
    })
  }, [])

  // Pure lookup against the loaded list — no request, no persistence. Used to
  // decide whether "Contactar" reuses a conversation or opens a fresh draft.
  const findChatWith = useCallback(
    (userId: string): Chat | undefined => chats.find((c) => c.users.includes(userId)),
    [chats],
  )

  const createChatWith = useCallback(
    async (toUserId: string): Promise<string> => {
      const chat = await createChat(toUserId)
      setChats((prev) => (prev.some((c) => c._id === chat._id) ? prev : [chat, ...prev]))
      void resolveSummaries([counterpartyId(chat)])
      return chat._id
    },
    [counterpartyId, resolveSummaries],
  )

  const value = useMemo<ChatState>(
    () => ({
      chats,
      status,
      summaries,
      unreadCount: unread.size,
      reload,
      counterpartyOf: (chat) => summaries[counterpartyId(chat)],
      isUnread: (chatId) => unread.has(chatId),
      findChatWith,
      createChatWith,
      messagesFor: (chatId) => messages[chatId] ?? [],
      threadStatusFor: (chatId) => threadStatus[chatId] ?? 'loading',
      loadMessages,
      sendMessage,
      markChatRead,
    }),
    [
      chats,
      status,
      summaries,
      unread,
      messages,
      threadStatus,
      reload,
      counterpartyId,
      findChatWith,
      createChatWith,
      loadMessages,
      sendMessage,
      markChatRead,
    ],
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}
