import { api } from '@/lib/api'
import type { Chat, ChatMessage } from '../types'

/** List all of the caller's chats (no pagination — the API returns them all). */
export async function fetchRecentChats(): Promise<Chat[]> {
  const data = await api<{ chats: Chat[] }>('/chat/recent')
  return data.chats
}

/** Message history for a chat, ordered oldest-first (render top-to-bottom). */
export async function fetchChatMessages(chatId: string): Promise<ChatMessage[]> {
  const data = await api<{ messages: ChatMessage[] }>(`/chat/${chatId}/messages`)
  return data.messages
}

/**
 * Send a message. The API's `chatMessage` omits `type` (we are always the
 * sender), so we stamp `outgoing` here for immediate optimistic rendering. The
 * later `chat:message` socket echo carries the same `_id` — dedupe on it.
 */
export async function sendChatMessage(chatId: string, message: string): Promise<ChatMessage> {
  const data = await api<{ chatMessage: Omit<ChatMessage, 'type'> }>(`/chat/${chatId}/message`, {
    method: 'POST',
    body: { message },
  })
  return { ...data.chatMessage, type: 'outgoing' }
}

/**
 * Find-or-create a private chat with another user. Calling it repeatedly for
 * the same pair returns the same chat, so it is safe to call every time the
 * user opens a conversation with someone.
 */
export async function createChat(to: string): Promise<Chat> {
  const data = await api<{ chat: Chat }>('/chat/create', {
    method: 'POST',
    body: { to },
  })
  return data.chat
}
