import type { Chat } from '@/sections/chat/types'
import { findOrCreateChat } from './mockChatStore'

export function mockCreateChat(to: string): Promise<Chat> {
  return Promise.resolve(findOrCreateChat(to))
}
