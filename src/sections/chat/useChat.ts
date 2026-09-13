import { useContext } from 'react'
import { ChatContext, type ChatState } from './chatContextValue'

export function useChat(): ChatState {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used within a ChatProvider')
  return ctx
}
