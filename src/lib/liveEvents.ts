import type { Notification } from '@/sections/notifications/actions/fetchNotifications'
import type { ChatMessage } from '@/sections/chat/types'

/**
 * Tiny in-process pub/sub bus that decouples the single `/live` socket (owned by
 * `NotificationsProvider` via `connectLiveSocket`) from every other consumer.
 * The socket layer publishes raw server events here; providers subscribe to the
 * ones they care about. This is how chat gets live delivery without opening a
 * second socket or coupling `ChatProvider` to `NotificationsProvider`.
 */

/** Raw chat message as it arrives on the socket — the server omits `type`. */
export type LiveChatMessage = Omit<ChatMessage, 'type'>

type LiveEventMap = {
  /** The shared socket (re)connected — subscribers should re-sync from REST. */
  connect: void
  notification: Notification
  chatMessage: LiveChatMessage
}

type Listener<T> = (payload: T) => void

const registry: { [K in keyof LiveEventMap]: Set<Listener<LiveEventMap[K]>> } = {
  connect: new Set(),
  notification: new Set(),
  chatMessage: new Set(),
}

/** Subscribe to a live event. Returns an unsubscribe function. */
export function onLiveEvent<K extends keyof LiveEventMap>(
  event: K,
  listener: Listener<LiveEventMap[K]>,
): () => void {
  const set = registry[event] as Set<Listener<LiveEventMap[K]>>
  set.add(listener)
  return () => {
    set.delete(listener)
  }
}

/** Publish a live event to all current subscribers. */
export function emitLiveEvent<K extends keyof LiveEventMap>(
  event: K,
  payload: LiveEventMap[K],
): void {
  const set = registry[event] as Set<Listener<LiveEventMap[K]>>
  set.forEach((listener) => listener(payload))
}
