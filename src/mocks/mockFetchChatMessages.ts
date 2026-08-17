import type { ChatMessage } from '@/sections/chat/types'
import { getMessages } from './mockChatStore'

export function mockFetchChatMessages(chatId: string): Promise<ChatMessage[]> {
  return Promise.resolve(getMessages(chatId))
}
