import type { Chat } from '@/sections/chat/types'
import { getRecentChats } from './mockChatStore'

export function mockFetchRecentChats(): Promise<Chat[]> {
  return Promise.resolve(getRecentChats())
}
