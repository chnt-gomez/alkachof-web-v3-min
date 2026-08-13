import { createContext } from 'react'
import type { Chat, ChatMessage, UserSummary } from './types'

export type ChatStatus = 'loading' | 'ready' | 'error'

export type ChatState = {
  /** All of the caller's chats, most-recent activity first. */
  chats: Chat[]
  status: ChatStatus
  /** Counterparty display info keyed by user id (resolver seam). */
  summaries: Record<string, UserSummary>
  /** Client-side unread tracking. Empty until the live socket lands (deferred). */
  unreadCount: number

  reload: () => void
  /** Display info for the other member of a chat. */
  counterpartyOf: (chat: Chat) => UserSummary | undefined
  isUnread: (chatId: string) => boolean

  /**
   * Existing chat with `userId` from the already-loaded list, or `undefined` if
   * there is none. Pure lookup — makes no request and, crucially, persists
   * nothing (so a visitor who never sends leaves no empty chat behind).
   */
  findChatWith: (userId: string) => Chat | undefined
  /**
   * Persist a find-or-create chat with `userId` and resolve to its id. Call
   * this only at the moment of the first send — never on mere intent to chat.
   */
  createChatWith: (userId: string) => Promise<string>

  // Thread (per-chat) --------------------------------------------------------
  messagesFor: (chatId: string) => ChatMessage[]
  threadStatusFor: (chatId: string) => ChatStatus
  loadMessages: (chatId: string) => void
  sendMessage: (chatId: string, text: string) => Promise<void>
  markChatRead: (chatId: string) => void
}

export const ChatContext = createContext<ChatState | null>(null)
