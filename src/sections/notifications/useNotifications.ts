import { useContext } from 'react'
import { NotificationsContext, type NotificationsState } from './notificationsContextValue'

export function useNotifications(): NotificationsState {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used within a NotificationsProvider')
  return ctx
}
