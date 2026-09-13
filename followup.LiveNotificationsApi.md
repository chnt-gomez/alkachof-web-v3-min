# Follow-up: Live Notifications — Frontend Handoff

This document hands the **live notification socket** to the web client team, together with the
refactored notification REST endpoints. It is the contract for making the notification bell
"alive" — new notifications appear without reloading the page.

## Summary

- Notifications are stored in MongoDB and served over REST (source of truth). The socket is a
  **best-effort live push** on top: if the socket is down or the tab reconnects, the REST
  endpoints recover anything missed.
- Transport is **Socket.IO v4** (`socket.io-client` on the frontend must be v4-compatible).
- Every user gets a **private server-assigned channel**. There are no shared rooms, no
  client-side room joining, and no way to subscribe to another user's events.

## Connecting

Namespace: **`/live`** on the API origin.

```javascript
import { io } from 'socket.io-client';

const socket = io(`${API_ORIGIN}/live`, {
    auth: { token: accessToken }   // the same JWT used for REST calls, bare or 'Bearer '-prefixed
});
```

- Connect **after login** (the handshake needs a valid access token) and disconnect on logout.
- The handshake is rejected with `connect_error` (`Error: Unauthorized`) when the token is
  missing, invalid, expired, or the user is no longer `active`.
- **Token refresh:** the token is only checked at handshake time. After refreshing the access
  token, update `socket.auth.token` so the next (re)connection uses the fresh token:

```javascript
socket.on('connect_error', async (err) => {
    if (err.message === 'Unauthorized') {
        socket.auth.token = await refreshAccessToken();
        socket.connect();
    }
});
```

## Events (server → client)

There are no client → server events. The client only listens.

### `notification:new`

Emitted to the owner the moment any service creates a notification (e.g. a catalog broadcast).
Payload is the full notification, identical to the REST shape:

```json
{
  "_id": "64a1b2c3d4e5f6a7b8c9d0f9",
  "userId": "64a1b2c3d4e5f6a7b8c9d0e1",
  "message": "My Shop: New drops this week!",
  "metadata": {
    "navigationUrl": "/catalog/64a1b2c3d4e5f6a7b8c9d0a4?product=64a1b2c3d4e5f6a7b8c9d0a3"
  },
  "createdOn": "2026-07-29T16:20:00.000Z",
  "seenOn": false
}
```

- `metadata.navigationUrl` — a **relative in-app path** (always starts with `/`); navigate to
  it as-is with the client router. `null` means the notification is **informational** (render
  the message, no navigation). The API owns this mapping — the client never builds routes from
  entity ids. See `followup.NotificationNavigationUrl.md` (in the API repo) for the full contract.
- `seenOn` is a **boolean** (seen flag), not a date.

Recommended handling: prepend to the in-memory notification list, bump the unseen badge, and
optionally toast `message`.

## Catch-up on connect / reconnect

Socket delivery is fire-and-forget — anything emitted while the tab was closed or disconnected
is **not** replayed on the socket. On every `connect` (including auto-reconnects), re-sync from
REST:

```javascript
socket.on('connect', async () => {
    const { notifications } = await api.get('/notification/recent');  // authoritative state
    store.replaceNotifications(notifications);
});
socket.on('notification:new', (notification) => store.prepend(notification));
```

## REST endpoints (recap)

All require `Authorization: Bearer <jwt>`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/notification/recent` | Notifications from the last 30 days |
| `GET` | `/notification/all` | All notifications for the user |
| `POST` | `/notification/{notificationId}/seen` | Mark one notification as seen (owner only, `403` otherwise) |

Marking as seen is REST-only; the socket does not echo seen-state changes (the acting tab
already knows, and cross-tab sync can lean on the catch-up fetch).

## Lifecycle checklist

1. Login → connect to `/live` with the access token.
2. On `connect` → fetch `/notification/recent`, render list + unseen badge.
3. On `notification:new` → prepend, bump badge, toast.
4. On click → `POST /notification/{id}/seen`, then navigate to `metadata.navigationUrl` if set
   (informational notifications have `null` and don't navigate).
5. On token refresh → update `socket.auth.token`.
6. On logout → `socket.disconnect()`.
