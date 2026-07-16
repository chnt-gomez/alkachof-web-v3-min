# Frontend Integration Guide: Announce Catalog (Call to Action)

**Audience:** Frontend team
**Feature:** Let a catalog owner send a "Call to Action" (CTA) — a one-per-day announcement that fans out an in-app notification to every subscriber of their catalog.
**Backend status:** Implemented and tested. This guide describes the HTTP contract only — no backend code knowledge required.

---

## 1. The mental model (read this first)

- A catalog owner writes a short **message** and optionally attaches **one item** from their own catalog.
- Pressing "send" creates one in-app **notification** for every (non-banned) subscriber of that catalog.
- An owner may do this **once per 24 hours per catalog**. The limit is a rolling window, not a calendar day, and it is **not** bankable — skipping a day does not grant two sends the next day.
- Subscribers read these announcements in their **notifications feed**.
- Email delivery is **not** part of this release. The backend has a stubbed hook; do not build UI that promises "we emailed your subscribers." The in-app notification is the guaranteed effect.

So there are **two frontend surfaces**:
1. **Owner side** — the "Announce" / "Notify subscribers" composer (send the CTA).
2. **Subscriber side** — the notifications feed (read the CTA).

---

## 2. Owner side — sending a CTA

### Endpoint

```
POST /catalog/{catalogId}/broadcast
```

- `{catalogId}` is the owner's own catalog id.
- **Auth required.** Send the user's JWT: `Authorization: Bearer <token>`.
- Only the catalog **owner** may call this. A non-owner gets `403`.

> ⚠️ The path is `/broadcast` for historical reasons — it *is* the "Announce / CTA" feature. There is no `/cta` endpoint.

### Request body

```jsonc
{
  "message": "New winter drops just landed! 🧣",  // REQUIRED, non-empty string
  "itemId": "64a1b2c3d4e5f6a7b8c9d0e1"            // OPTIONAL, an item id from THIS catalog
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `message` | string | ✅ Yes | Must be non-empty after trimming. This is the announcement text. |
| `itemId` | string | ❌ No | If present, must be an item that belongs to `{catalogId}`. Use it to link the announcement to a specific product. Omit it (or send `null`) for a general catalog announcement. |

The backend trims `message` for you, but you should trim/validate client-side too so the user gets instant feedback instead of a round-trip `400`.

### Responses

| HTTP | Meaning | Suggested UI |
|---|---|---|
| `200` | Sent. Notifications were created (or the catalog simply has no subscribers — see note). | Success toast: "Your subscribers have been notified." Then put the button on cooldown for 24h. |
| `400` | Bad input — either `message` was missing/empty, or `itemId` doesn't belong to this catalog. | Inline validation error. Read `body.message` for the reason. |
| `401` | Not authenticated / token expired. | Redirect to login / refresh token. |
| `403` | Authenticated, but not the owner of this catalog. | "You can only announce your own catalog." (should not normally happen if UI is gated). |
| `429` | **Daily allowance already used.** | Disable the send button, show when they can try again (see `availableAt` below). |

#### `200` success body

```json
{ "message": "Broadcast sent successfully" }
```

> **Note on "no subscribers":** If the catalog has zero subscribers, the call still returns `200` but nothing is sent **and the daily allowance is NOT consumed** — the owner can still send later that day once they have subscribers. If you want to be precise in the UI you can't distinguish "sent to N people" from "no subscribers" by status code alone (both are `200`). For this release, a generic success message is fine. If you need the exact count, request a backend enhancement (not currently returned).

#### `429` cooldown body

```json
{
  "message": "Daily call to action allowance already used. Try again tomorrow.",
  "availableAt": "2026-07-16T09:30:00.000Z"
}
```

- `availableAt` is an **ISO 8601 UTC timestamp** for when the next CTA becomes available.
- Use it to render a countdown or a disabled button with a tooltip: *"Next announcement available at 9:30 AM tomorrow."*
- Convert to the user's local timezone for display.

### Recommended owner-side flow

1. Gate the "Announce" button so only the catalog owner sees it.
2. Composer form:
   - Multiline text input for `message` (required). Consider a soft character limit (e.g. 280) for good UX — the backend does not currently enforce one.
   - Optional item picker populated from the owner's own catalog items. Selecting one sets `itemId`.
3. On submit → `POST /catalog/{catalogId}/broadcast`.
4. Handle responses per the table above.
5. On `200` or `429`, disable the button until `availableAt` (on `429` you get the timestamp directly; on `200` compute `now + 24h` locally, or just disable until a page refresh — the server is the source of truth and will return `429` if they retry early).

### Example (fetch)

```js
async function sendCatalogAnnouncement(catalogId, message, itemId, token) {
  const res = await fetch(`/catalog/${catalogId}/broadcast`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ message, itemId: itemId ?? null }),
  });

  const body = await res.json().catch(() => ({}));

  switch (res.status) {
    case 200:
      return { ok: true };
    case 429:
      return { ok: false, reason: 'cooldown', availableAt: body.availableAt };
    case 400:
      return { ok: false, reason: 'invalid', message: body.message };
    case 401:
      return { ok: false, reason: 'unauthenticated' };
    case 403:
      return { ok: false, reason: 'forbidden' };
    default:
      return { ok: false, reason: 'error', message: body.message };
  }
}
```

---

## 3. Subscriber side — reading notifications

CTAs arrive as notifications in the recipient's feed. Two read endpoints back this.

### Endpoints

```
GET /notification/recent    // notifications from the last 30 days
GET /notification/all       // full notification history
```

- **Both require auth:** `Authorization: Bearer <token>`.
- Both are scoped to the **logged-in user** (derived from the JWT) — there is no user id in the path.
- `401` if not authenticated.

### Response body (both endpoints)

```json
{
  "notifications": [
    {
      "_id": "64a1b2c3d4e5f6a7b8c9d0e8",
      "userId": "64a1b2c3d4e5f6a7b8c9d0e0",
      "notificationType": "catalog-update",
      "notificationAssociatedId": "64a1b2c3d4e5f6a7b8c9d0e2",
      "notificationTitle": "My Shop",
      "notificationDescription": "New winter drops just landed! 🧣",
      "notificationStatus": "unread",
      "notificationDate": "2026-07-15T18:04:21.000Z"
    }
  ]
}
```

### Field reference

| Field | Type | Meaning |
|---|---|---|
| `_id` | string | Notification id. |
| `userId` | string | The recipient (the logged-in subscriber). |
| `notificationType` | string | For CTAs this is always `"catalog-update"`. Other values (`"message"`, `"other"`) may exist for future features — filter or branch on this. |
| `notificationAssociatedId` | string | **The target of the announcement.** See the important caveat below. |
| `notificationTitle` | string | The catalog's alias/name (falls back to `"Mi catálogo en Alkachof"` if the catalog has no alias). Use as the notification heading. |
| `notificationDescription` | string | The owner's message text. Use as the notification body. |
| `notificationStatus` | string | `"unread"` or `"read"`. New CTAs arrive `"unread"`. |
| `notificationDate` | string | ISO 8601 timestamp of when it was created. Sort/display with this. |

### ⚠️ Important caveat about `notificationAssociatedId` (read before building the click target)

For a `catalog-update` notification, `notificationAssociatedId` is **either an item id or a catalog id**:

- If the owner attached an item → it's that **item's id**.
- If the owner sent a general announcement → it's the **catalog's id**.

**The payload does not currently tell you which one it is.** This is a known backend limitation (a discriminator field is planned for a future release). For now, options:

- **Safest for this release:** deep-link the notification to the **catalog page** using `notificationAssociatedId` when you can resolve it as a catalog, and treat item links as a later enhancement. Coordinate with backend before relying on item deep-links.
- If you attempt an item link, be prepared for the id to sometimes be a catalog id, and fail gracefully (fall back to the catalog or a neutral destination).

Please **do not** hard-assume it's always an item id — you will produce broken links for general announcements. Flag this to the backend team when you pick up the click-through behavior so we can prioritize the discriminator field.

### Read vs unread

- New CTAs are `"unread"`. Use `notificationStatus` to render unread badges / counts.
- **There is currently no "mark as read" HTTP endpoint exposed.** The service supports it internally but it is not wired to a route yet. If you need mark-as-read for the UI, request that endpoint from the backend team — don't block on it for the initial read-only feed.

---

## 4. End-to-end example flow

1. **Owner** opens their catalog dashboard → clicks "Announce to subscribers".
2. Types *"New winter drops just landed!"*, optionally picks an item.
3. Frontend `POST /catalog/{catalogId}/broadcast` with `{ message, itemId }`.
4. Backend creates one notification per non-banned subscriber, consumes the owner's 24h allowance, returns `200`.
5. **Subscriber** opens their notifications feed → frontend `GET /notification/recent`.
6. Renders `notificationTitle` (catalog name) + `notificationDescription` (message), with an unread badge.
7. If the owner tries to announce again within 24h → `429` with `availableAt`; frontend shows a cooldown state.

---

## 5. Quick reference

| Action | Method & path | Auth | Body | Success |
|---|---|---|---|---|
| Send CTA | `POST /catalog/{catalogId}/broadcast` | Bearer (owner) | `{ message, itemId? }` | `200 { message }` |
| List recent notifications (30d) | `GET /notification/recent` | Bearer | — | `200 { notifications: [...] }` |
| List all notifications | `GET /notification/all` | Bearer | — | `200 { notifications: [...] }` |

**Error codes to handle on send:** `400` (bad input), `401` (auth), `403` (not owner), `429` (daily limit — has `availableAt`).

---

## 6. Open items to coordinate with backend

These are known gaps — flag them when you build the corresponding UI:

1. **Item-vs-catalog link ambiguity** in `notificationAssociatedId` (see §3 caveat). A discriminator field is planned.
2. **No "mark as read" endpoint** yet (§3). Request it if the feed needs read-state toggling.
3. **No recipient count** returned on send (§2). A `200` doesn't tell you how many were notified, or whether there were zero subscribers.
4. **Email is stubbed** — don't promise email delivery in the UI copy for this release.

---

## 7. API docs (Swagger)

When running the API in a non-production environment, interactive docs are at:

```
GET /api-docs
```

Look under the **Catalog** tag for `POST /catalog/{catalogId}/broadcast` (schema: `BroadcastCatalogRequest`) and the **Notifications** tag for the notification read endpoints (schema: `Notification`).
