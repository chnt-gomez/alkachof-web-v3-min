import type { ChatMessage } from '@/sections/chat/types'
import { appendMessage } from './mockChatStore'

export function mockSendChatMessage(chatId: string, message: string): Promise<ChatMessage> {
  return Promise.resolve(appendMessage(chatId, message))
}
