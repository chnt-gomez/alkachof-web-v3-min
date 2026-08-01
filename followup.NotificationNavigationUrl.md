# Follow-up: Notification `navigationUrl` — Frontend Handoff

**Date:** 2026-07-30 · **Type:** API contract change (notification metadata overhaul) ·
**Supersedes:** `followup.NotificationItemDeepLink.md` and the metadata contract described in
`followup.LiveNotificationsApi.md` (that doc's payload examples are already updated).

This document is self-contained: everything the web client needs to handle notifications
after this change is here.

## TL;DR

Notification metadata no longer describes *what entity* a notification points at.
It now tells you *where to go*:

```json
"metadata": { "navigationUrl": "/catalog/64a1b2c3?product=64a1d0a3" }
```

The entire click handler becomes:

```javascript
async function onNotificationClick(notification) {
    await api.post(`/notification/${notification._id}/seen`);
    if (notification.metadata.navigationUrl) {
        router.navigate(notification.metadata.navigationUrl);
    }
}
```

No type switch, no id-to-route mapping, no extra fetches.

## The contract

### Notification shape (REST and socket, identical)

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

- **`metadata.navigationUrl`** — a **relative in-app path** (always starts with `/`).
  Navigate to it as-is with the client-side router. Never treat it as an external URL.
- **`navigationUrl: null`** — the notification is **informational**: render the message
  without a link (not clickable for navigation; marking it seen still applies). Examples:
  admin messages like "Your account has been reviewed."
- `seenOn` is a **boolean** seen-flag, not a date.
- `metadata` is always present and always has the `navigationUrl` key (possibly `null`) —
  no need to guard for a missing `metadata` object.

### Where this shape appears

| Surface | Endpoint / event |
|---|---|
| REST | `GET /notification/recent` (last 30 days) — the catch-up/source-of-truth fetch |
| REST | `GET /notification/all` — full history |
| REST | `POST /notification/{id}/seen` — returns the updated notification, same shape |
| Socket | `notification:new` on the `/live` namespace — payload is the full notification |

Socket connection, auth, and reconnect/catch-up behaviour are unchanged — see
`followup.LiveNotificationsApi.md` for that lifecycle. The only difference is the
`metadata` shape above.

## What to delete on the client

1. **The `metadata.type` → route mapping.** The `ITEM | USER | CATALOG | TRANSACTION`
   switch (and any constants/types for it) is dead. The API no longer sends `metadata.type`,
   `metadata.id`, or `metadata.catalogId` on any surface.
2. **The fetch-item fallback** for old `ITEM` notifications
   (`GET /item/:itemId` → read `catalogId` → build the deep link). Not needed for any
   notification, old or new.

**Do not keep a legacy branch "just in case":** old stored notifications are converted
**server-side** before they reach REST or the socket. The client will never see the legacy
fields. Conversion rules, for reference:

| Stored legacy metadata | Arrives as |
|---|---|
| `type: CATALOG, id` | `navigationUrl: "/catalog/:id"` |
| `type: ITEM, id, catalogId` | `navigationUrl: "/catalog/:catalogId?product=:id"` |
| `type: USER` or `TRANSACTION`, or `ITEM` without `catalogId` | `navigationUrl: null` (informational) |

The last row is a deliberate behaviour change: those old notifications used to be
"navigable" only via client-side guesswork; they now render as plain messages.

## UI expectations

- A notification with a `navigationUrl` is tappable and navigates in-app.
- A notification with `null` renders as a non-navigating message (style as you see fit —
  e.g. no chevron/hover affordance). Everything else (badge counts, toasts, mark-seen) is
  identical for both kinds.
- Defense-in-depth (optional but cheap): ignore a `navigationUrl` that doesn't start with
  `/`. The API validates this at write time (rejects absolute and `//host` URLs), so this
  should never trigger.

## Route ownership — read this before renaming routes

The **backend now owns the mapping** from entities to web-client paths, centralized in one
API module (`api/services/navigationUrlService.js`). Currently emitted paths:

- Catalog page: `/catalog/:catalogId`
- Product deep link: `/catalog/:catalogId?product=:itemId`

**If the frontend changes a route shape** (moves the catalog page, renames the `product`
query param), tell the API team — it's a one-line change on the backend, and new
notifications pick it up immediately. Caveat: already-stored notifications keep the path
they were created with, so keep a redirect/alias for retired routes if old notifications
should stay navigable.

## Admin panel (if the client exposes admin sends)

`POST /notification/admin/send` changed accordingly:

- **Removed:** `metadataId`, `metadataType`.
- **Added:** optional `navigationUrl` — relative `/`-prefixed path; the API returns **400**
  for absolute or protocol-relative values. Omit it to send an informational notification.
- Unchanged: `message` + one of `userId`/`email` required; `email` wins when both are sent.

## Acceptance checklist

- [ ] Tapping a broadcast notification (catalog or product) navigates via
      `metadata.navigationUrl` alone — no item fetch, no type mapping in the codebase.
- [ ] A notification with `navigationUrl: null` renders as a plain message and does not
      navigate; mark-seen still works on it.
- [ ] Old notifications (created before this change) still deep-link correctly with no
      special-casing on the client.
- [ ] Socket-delivered (`notification:new`) and REST-fetched notifications are handled by
      the same code path.
