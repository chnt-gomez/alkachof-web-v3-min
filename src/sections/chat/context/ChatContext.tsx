import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '@/sections/auth/useAuth'
import { fetchRecentChats, fetchChatMessages, sendChatMessage, createChat } from '../actions/chatApi'
import { fetchUserSummaries } from '../actions/fetchUserSummaries'
import type { Chat, ChatMessage, UserSummary } from '../types'
import { ChatContext, type ChatState, type ChatStatus } from '../chatContextValue'

/**
 * App-wide chat store. REST is the source of truth (`/chat/recent` +
 * `/{chatId}/messages`); sending is a REST POST rendered optimistically. Mounted
 * once inside `AuthProvider`; loads on login, clears on logout.
 *
 * Live delivery is intentionally deferred for this draft: the contract mandates
 * a single shared `/live` socket (the same one notifications owns), so rather
 * than open a second connection here, the socket seam is left for a follow-up.
 * `upsertMessage` + `markUnread` below are the hooks a `chat:message` handler
 * will call; until then unread stays at 0 and history recovers everything on
 * load (offline users lose nothing — REST is authoritative).
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
  }, [isAuthenticated, syncChats])

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

  // Insert or replace a message by `_id` so a socket echo of our own send is a
  // no-op rather than a duplicate bubble (used by the future socket handler).
  const upsertMessage = useCallback((chatId: string, msg: ChatMessage) => {
    setMessages((prev) => {
      const existing = prev[chatId] ?? []
      const next = existing.some((m) => m._id === msg._id)
        ? existing.map((m) => (m._id === msg._id ? msg : m))
        : [...existing, msg]
      return { ...prev, [chatId]: next }
    })
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

  // Keep a stable getter identity while reading the latest maps.
  const messagesRef = useRef(messages)
  messagesRef.current = messages
  const threadStatusRef = useRef(threadStatus)
  threadStatusRef.current = threadStatus

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
      messagesFor: (chatId) => messagesRef.current[chatId] ?? [],
      threadStatusFor: (chatId) => threadStatusRef.current[chatId] ?? 'loading',
      loadMessages,
      sendMessage,
      markChatRead,
    }),
    [
      chats,
      status,
      summaries,
      unread,
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
