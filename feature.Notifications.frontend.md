# Notifications — Frontend Integration Blueprint

Everything the web client needs to fetch notifications, render them, build the correct deep-link per notification, and mark them as seen.

---

## 1. Overview

The notification feed shows the user important events (broadcasts today; purchases, subscribers, transactions later). Each notification carries a **`message`** to display and a **`metadata`** object that tells the UI *what kind of thing* the notification points at, so the frontend can build the correct link. The backend never builds links — that is the frontend's job, driven entirely by `metadata.type`.

There are three operations:
1. **List recent** (last 30 days) — the default feed.
2. **List all** — full history.
3. **Mark one as seen** — flips `seenOn` to `true`.

---

## 2. Base URL & authentication

All notification endpoints are mounted under **`/notification`** and **require authentication**.

Send the access token as a standard Bearer header on every request:

```
Authorization: Bearer <accessToken>
```

- The token is the same JWT returned by `/login` (and refreshed via `/refresh`).
- There is **no per-notification token** — the server scopes everything to the authenticated user via the JWT `userId`. The list endpoints only ever return the caller's own notifications.
- A missing/expired/invalid token returns **401** (see §6). On a 401 from any call, run your existing refresh-then-retry flow; if refresh also fails, send the user to login.

---

## 3. The Notification object

Every notification returned by the API has this shape:

```jsonc
{
  "_id": "64a1b2c3d4e5f6a7b8c9d0e8",   // notification id — use for "mark as seen"
  "userId": "64a1b2c3d4e5f6a7b8c9d0e0", // the recipient (always the caller)
  "message": "My Shop: New drops this week!", // display text (already composed, see §5)
  "metadata": {
    "id": "64a1b2c3d4e5f6a7b8c9d0e2",   // id of the linked entity
    "type": "CATALOG"                    // ITEM | USER | CATALOG | TRANSACTION
  },
  "createdOn": "2026-07-17T10:30:00.000Z", // ISO timestamp
  "seenOn": false                        // boolean — false = unread, true = seen
}
```

Field notes:
- **`message`** is display-ready. Render it as-is; do not reconstruct it.
- **`seenOn`** is a **boolean**, not a timestamp. `false` = unread (show the unread indicator), `true` = seen.
- **`createdOn`** is a UTC ISO-8601 string. Format it client-side (relative time like "2h ago" is recommended).
- **`metadata.id` + `metadata.type`** together are how you build the link (see §4).

---

## 4. Building the link from `metadata` (the important part)

`metadata.type` is an enum with four possible values. Map each to the correct client route using `metadata.id`:

| `metadata.type` | Points at | Suggested frontend route |
|---|---|---|
| `ITEM` | A specific product | `/item/{metadata.id}` |
| `CATALOG` | A seller's catalog | `/catalog/{metadata.id}` |
| `TRANSACTION` | An order / hand-off | `/pedidos/{metadata.id}` (Transactions page) |
| `USER` | A user profile | `/profile/{metadata.id}` |

Recommended handling:

```js
function notificationLink({ metadata }) {
  switch (metadata.type) {
    case 'ITEM':        return `/item/${metadata.id}`;
    case 'CATALOG':     return `/catalog/${metadata.id}`;
    case 'TRANSACTION': return `/pedidos/${metadata.id}`;
    case 'USER':        return `/profile/${metadata.id}`;
    default:            return null; // unknown type — render as non-clickable
  }
}
```

> **Forward-compatibility:** treat `metadata.type` as an open set. If a future backend release adds a new type your build doesn't know, fall through to a non-clickable notification rather than crashing. Only `ITEM` and `CATALOG` are emitted today (by broadcasts); `TRANSACTION` and `USER` are reserved for upcoming events.

---

## 5. What produces notifications today

Only **catalog broadcasts** (the CTA feature) currently create notifications. When a catalog owner broadcasts:
- Each active (non-banned) subscriber gets one notification.
- **`message`** is composed server-side as `"{catalogAlias}: {ownerMessage}"` — e.g. owner sends `"New drops this week!"` for catalog "My Shop" → `message` = `"My Shop: New drops this week!"`. Render it directly.
- **`metadata.type`** is `ITEM` if the broadcast referenced a specific item, otherwise `CATALOG`.
- **`metadata.id`** is that item's id, or the catalog id.

So today every notification links to either an item or a catalog. Design the feed to handle the other two types gracefully, but expect only these two in practice for now.

---

## 6. Endpoints

### 6.1 `GET /notification/recent` — recent feed (last 30 days)

The default feed to show in the notifications panel.

**Request**
```
GET /notification/recent
Authorization: Bearer <accessToken>
```

**200 response**
```jsonc
{
  "notifications": [
    {
      "_id": "64a1b2c3d4e5f6a7b8c9d0e8",
      "userId": "64a1b2c3d4e5f6a7b8c9d0e0",
      "message": "My Shop: New drops this week!",
      "metadata": { "id": "64a1b2c3d4e5f6a7b8c9d0e2", "type": "CATALOG" },
      "createdOn": "2026-07-17T10:30:00.000Z",
      "seenOn": false
    }
  ]
}
```

Notes:
- Always an object with a **`notifications` array** (empty array if none — not `null`).
- **Not sorted or paginated** by the server. Sort client-side by `createdOn` descending for newest-first.
- "Recent" = created within the last 30 days. Older ones are excluded here but still available via `/all`.
- Despite the older "(unread)" wording in some docs, this returns **both read and unread** within the window. Compute the unread badge count yourself from `seenOn === false`.

### 6.2 `GET /notification/all` — full history

Same shape, no date filter. Use it for a "see all" / history view.

**Request**
```
GET /notification/all
Authorization: Bearer <accessToken>
```

**200 response** — identical structure to `/recent`:
```jsonc
{ "notifications": [ /* ...every notification for the user... */ ] }
```

Also unsorted and unpaginated — sort client-side.

### 6.3 `POST /notification/{notificationId}/seen` — mark as seen

Flips `seenOn` to `true`. Call this when the user opens/clicks a notification (or on an explicit "mark as read").

**Request**
```
POST /notification/64a1b2c3d4e5f6a7b8c9d0e8/seen
Authorization: Bearer <accessToken>
```
No request body.

**200 response** — returns the updated notification:
```jsonc
{
  "notification": {
    "_id": "64a1b2c3d4e5f6a7b8c9d0e8",
    "userId": "64a1b2c3d4e5f6a7b8c9d0e0",
    "message": "My Shop: New drops this week!",
    "metadata": { "id": "64a1b2c3d4e5f6a7b8c9d0e2", "type": "CATALOG" },
    "createdOn": "2026-07-17T10:30:00.000Z",
    "seenOn": true
  }
}
```

Notes:
- The response key is **`notification`** (singular), not `notifications`.
- This endpoint is **owner-guarded**: you can only mark your *own* notifications. Marking someone else's id returns **403**.
- It is idempotent in effect — marking an already-seen notification simply returns it with `seenOn: true`.
- There is **no "mark all as seen"** endpoint and **no unmark**. To mark many, call this per id.

---

## 7. Error responses (read carefully — two shapes)

The API returns **two different error body shapes** depending on where the failure happens. Your fetch wrapper must handle both.

**A) Auth / authorization middleware failures → flat `{ message }`**

Returned by the token and ownership guards (401/403):
```json
{ "message": "Auth failed" }
```

**B) Controller / application failures → nested `{ error: { message } }`**

Returned by the global error handler for anything the controller passes to `next(err)` (e.g. 404, 500):
```json
{ "error": { "message": "Notification not found" } }
```

A defensive extractor:
```js
function extractError(body) {
  return body?.error?.message   // controller/global handler shape
      ?? body?.message          // middleware shape
      ?? 'Unexpected error';
}
```

**Status codes you can receive:**

| Status | Meaning | Body shape | Frontend action |
|---|---|---|---|
| 200 | Success | (data) | Render |
| 401 | No/invalid/expired token, or not authenticated | `{ message }` | Refresh token → retry; else login |
| 403 | Authenticated but not the owner (mark-as-seen on another user's notification) | `{ message }` | Do not retry; treat as a bug/stale id |
| 404 | Notification id not found (mark-as-seen) | `{ error: { message } }` | Drop it from the list / refresh feed |
| 500 | Server error | `{ error: { message } }` | Show generic error, allow retry |

---

## 8. Recommended UI flow

1. **On app load / opening the panel:** `GET /notification/recent`, sort by `createdOn` desc.
2. **Unread badge:** count `notifications.filter(n => !n.seenOn).length`. There is no dedicated count endpoint — derive it client-side.
3. **Render each row:** `message` as the text, relative time from `createdOn`, unread styling when `seenOn === false`, and a link from `notificationLink(n)` (§4).
4. **On click:** navigate to `notificationLink(n)`, and fire `POST /notification/{_id}/seen`. Optimistically set `seenOn = true` locally; reconcile with the returned object. On 404, remove the row.
5. **"See all" view:** `GET /notification/all`, same rendering.
6. **Polling/refresh:** there are no websockets/push for notifications yet — refetch `/recent` on panel open or on an interval of your choosing.

---

## 9. Quick reference

| Need | Call |
|---|---|
| Default feed (30 days) | `GET /notification/recent` → `{ notifications: [...] }` |
| Full history | `GET /notification/all` → `{ notifications: [...] }` |
| Mark one seen | `POST /notification/{id}/seen` → `{ notification: {...} }` |
| Unread count | client-side: `n.seenOn === false` |
| Deep link | client-side from `metadata.type` + `metadata.id` |
| Auth | `Authorization: Bearer <token>` on every request |

**Not available yet (do not build against):** mark-all-as-seen, unmark, server-side sort/pagination, unread-count endpoint, real-time push. All are client-side or out of scope for this release.
