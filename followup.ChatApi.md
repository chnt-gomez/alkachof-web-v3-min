# Follow-up: Chat (Private Messaging) — Frontend Handoff

This document hands the **private chat feature** to the web client team: the REST endpoints and
the live `chat:message` socket event. It is the contract for building the chat UI — a quick demo
first, polish later.

## Summary

- Chat is **1:1 and private**: exactly two users per chat. Any two `active` (registered, not
  banned) users can chat; no purchase/catalog relationship is required.
- Messages are stored in MongoDB and served over REST (**source of truth**). The socket is a
  **best-effort live push** on top — if the socket is down or the tab reconnects, the REST
  history recovers anything missed. **Offline users lose nothing.**
- Chat **reuses the exact same `/live` Socket.IO connection as notifications** (see
  `followup.LiveNotificationsApi.md`). There is **no second socket and no chat-specific
  namespace or room** — you connect to `/live` once and listen for both `notification:new` and
  `chat:message`. If live notifications are already wired, chat is just one more `.on(...)`.

## The socket (recap — same connection as notifications)

Namespace **`/live`**, one private server-assigned room per user. Connect once after login:

```javascript
import { io } from 'socket.io-client';

const socket = io(`${API_ORIGIN}/live`, {
    auth: { token: accessToken }   // same JWT as REST, bare or 'Bearer '-prefixed
});
```

- There are **no client → server events** for chat. Sending a message is a **REST call** (below),
  not a socket emit. The client only *listens* on the socket.
- Handshake, `connect_error`/`Unauthorized`, and token-refresh handling are identical to
  notifications — see `followup.LiveNotificationsApi.md`. Do not duplicate the socket; add the
  chat listener to the one you already have.

### Event: `chat:message` (server → client)

Emitted when a message is sent in a chat you belong to. Delivered to **both** members — the
recipient **and** the sender's other tabs/devices (multi-device sync).

```json
{
  "_id": "64a1b2c3d4e5f6a7b8c9d0f9",
  "chatId": "64a1b2c3d4e5f6a7b8c9d0f8",
  "sender": "64a1b2c3d4e5f6a7b8c9d0e1",
  "message": "Hello! Is this still available?",
  "sent": "2026-08-13T17:20:00.000Z"
}
```

- **Route it by `chatId`.** Append to the open conversation if it matches; otherwise bump an
  unread indicator on that chat in the list.
- **`type` is not on the socket payload.** Compute direction yourself:
  `sender === myUserId ? 'outgoing' : 'incoming'`. (History reads *do* include `type` — see below.)
- **Dedupe by `_id`.** Because the sender also receives its own message over the socket, a tab
  that already appended the message optimistically (from the `POST` response) will see it again
  here. Key messages by `_id` so the echo is a no-op instead of a duplicate bubble.

## REST endpoints

All require `Authorization: Bearer <jwt>`. Base path `/chat`.

| Method | Path | Purpose | Success |
|---|---|---|---|
| `POST` | `/chat/create` | Find-or-create a private chat with another user | `201` |
| `GET` | `/chat/recent` | List all of the caller's chats | `200` |
| `GET` | `/chat/{chatId}/messages` | Message history for a chat (members only) | `200` |
| `POST` | `/chat/{chatId}/message` | Send a message (members only) | `201` |

### `POST /chat/create`

Request:
```json
{ "to": "<recipientUserId>" }
```

Response `201`:
```json
{
  "message": "Chat created",
  "chat": {
    "_id": "64a1b2c3d4e5f6a7b8c9d0f8",
    "users": ["<myUserId>", "<recipientUserId>"],
    "createdOn": "2026-08-13T17:00:00.000Z",
    "status": "active"
  }
}
```

- **Find-or-create:** calling this twice for the same pair returns the **same** chat (still
  `201`), never a duplicate. Safe to call every time the user opens a conversation with someone.
- `400` if `to` is missing, equals your own id (self-chat), or the recipient is not an `active`
  user.

### `GET /chat/recent`

Response `200`:
```json
{
  "chats": [
    { "_id": "64a1...f8", "users": ["<a>", "<b>"], "createdOn": "...", "status": "active" }
  ]
}
```

- No pagination (returns all of the user's chats). Counterparty is whichever id in `users` is not
  yours — resolve names via your existing profile/user lookups (no name is included here yet).

### `GET /chat/{chatId}/messages`

Response `200`:
```json
{
  "messages": [
    {
      "_id": "64a1...01",
      "chatId": "64a1...f8",
      "sender": "<a>",
      "message": "Hi!",
      "sent": "2026-08-13T17:01:00.000Z",
      "type": "outgoing"
    },
    {
      "_id": "64a1...02",
      "chatId": "64a1...f8",
      "sender": "<b>",
      "message": "Hello!",
      "sent": "2026-08-13T17:02:00.000Z",
      "type": "incoming"
    }
  ]
}
```

- **Ordered oldest-first** — render top-to-bottom as-is.
- `type` (`incoming`/`outgoing`) is server-computed relative to the caller — use it directly for
  bubble alignment. (The socket payload omits it; compute from `sender` there.)
- `403` if you are not a member of the chat; no pagination yet.

### `POST /chat/{chatId}/message`

Request:
```json
{ "message": "Hello!" }
```

Response `201`:
```json
{
  "message": "Message sent",
  "chatMessage": {
    "_id": "64a1...02",
    "chatId": "64a1...f8",
    "sender": "<myUserId>",
    "message": "Hello!",
    "sent": "2026-08-13T17:02:00.000Z"
  }
}
```

- Use `chatMessage` to render your own bubble immediately (optimistic send). The matching
  `chat:message` socket echo will carry the **same `_id`** — dedupe on it.
- `400` empty/missing `message` · `403` not a member · `404` chat not found.

## Error responses

| Status | When |
|---|---|
| `400` | `create`: missing/`self`/inactive recipient. `message`: empty or missing text. |
| `401` | Missing/invalid/expired token, or the user is not `active`. |
| `403` | Authenticated but not a member of that chat. |
| `404` | Chat id does not exist (on send). |

Error body shape: `{ "message": "<reason>" }`.

## Catch-up on connect / reconnect

Socket delivery is fire-and-forget — messages sent while the tab was closed are **not** replayed
on the socket. On every `connect` (including auto-reconnects), re-sync from REST:

```javascript
socket.on('connect', async () => {
    const { chats } = await api.get('/chat/recent');
    store.setChats(chats);
    if (openChatId) {
        const { messages } = await api.get(`/chat/${openChatId}/messages`);
        store.setMessages(openChatId, messages);   // authoritative history
    }
});

socket.on('chat:message', (msg) => {
    store.upsertMessageById(msg.chatId, msg);       // dedupe by _id
});
```

## Quick demo flow (minimum to see it working)

Two browsers, two logged-in users (A and B). Reuse the login/JWT you already have.

1. **Both** connect to `/live` with their access token and add the `chat:message` listener.
2. **A** opens a chat with B: `POST /chat/create { to: <B.userId> }` → keep `chat._id`.
3. **A** loads history: `GET /chat/{chatId}/messages` (empty first time).
4. **A** sends: `POST /chat/{chatId}/message { message: "hi B" }` → append `chatMessage`
   optimistically.
5. **B** receives the `chat:message` event live (no reload) and appends it (`type: 'incoming'`).
6. **B** replies with `POST /chat/{chatId}/message` → **A** receives it live.
7. Reload either tab → `GET /chat/{chatId}/messages` shows the full persisted history (proves the
   offline/persistence path).

`GET /chat/recent` backs the conversation list on the side; poll or refetch it on `connect`.

## Lifecycle checklist

1. Login → connect to `/live` (shared with notifications), add `chat:message` listener.
2. Open the chat list from `GET /chat/recent`.
3. Open a conversation → `POST /chat/create` (find-or-create) then `GET /{chatId}/messages`.
4. Send → `POST /{chatId}/message`; render `chatMessage` optimistically.
5. On `chat:message` → route by `chatId`, dedupe by `_id`, append or bump unread.
6. On `connect`/reconnect → refetch `/chat/recent` and the open conversation's messages.
7. On token refresh → update `socket.auth.token` (as for notifications).
8. On logout → `socket.disconnect()`.

## Known gaps (intentional for the MVP — polish later)

- **No pagination** on `/chat/recent` or message history (full datasets).
- **No read receipts / unread counts / typing indicators** server-side — track unread on the
  client if the demo needs it.
- **No counterparty name** in responses — resolve ids via existing profile lookups.
- **No group chats, edit, delete, or attachments.**
- Ban is enforced at chat-create time; a user banned mid-session can still send until their JWT
  expires (same as everywhere else in the API).
