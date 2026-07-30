import { io, type Socket } from 'socket.io-client'
import { API_BASE_URL, refreshAccessToken } from '@/lib/api'
import { getToken } from '@/lib/auth'
import { IS_DEV_STAGE } from '@/lib/stage'
import type { Notification } from './actions/fetchNotifications'

export type LiveSocketHandlers = {
  /**
   * Fired on every successful (re)connection. Socket delivery is
   * fire-and-forget — anything emitted while disconnected is lost — so the
   * handler must re-sync from REST (the source of truth).
   */
  onConnect: () => void
  /** A notification was just created for this user (`notification:new`). */
  onNotification: (notification: Notification) => void
}

/**
 * Open the private live-notification channel: Socket.IO v4, namespace `/live`
 * on the API origin, authenticated with the same JWT used for REST calls.
 * Server → client only; there are no client-emitted events.
 *
 * Returns a cleanup function that disconnects the socket (call on logout).
 * In dev stage there is no server, so this is a no-op — live pushes simply
 * never arrive and the UI runs on the mocked REST fetch alone.
 */
export function connectLiveSocket({ onConnect, onNotification }: LiveSocketHandlers): () => void {
  if (IS_DEV_STAGE) return () => {}

  const socket: Socket = io(`${API_BASE_URL}/live`, {
    auth: { token: getToken() ?? '' },
  })

  socket.on('connect', onConnect)
  socket.on('notification:new', onNotification)

  // The token is only checked at handshake time. On an auth rejection,
  // refresh the access token and reconnect with the fresh one; if the
  // refresh itself fails there is no session left, so stop retrying.
  socket.on('connect_error', async (err) => {
    if (err.message !== 'Unauthorized') return
    const token = await refreshAccessToken()
    if (!token) return
    ;(socket.auth as { token: string }).token = token
    socket.connect()
  })

  return () => {
    socket.disconnect()
  }
}
