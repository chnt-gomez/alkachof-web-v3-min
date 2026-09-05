# Instagram Import — API handoff

Backend for turning a seller's Instagram posts into catalog products, via **Phyllo** (the aggregator that owns the Instagram OAuth handshake). Engineering detail lives in `CLAUDE.md` §V; this file is what the web client needs.

Base path `/phyllo`. Every endpoint below needs `Authorization: Bearer <accessToken>`.

---

## The flow

```
1. POST /phyllo/connect-token   -> { sdkToken, workPlatformId }
2. open Phyllo Connect SDK with that token
3. GET  /phyllo/account         -> poll until status === 'CONNECTED'
4. GET  /phyllo/posts           -> the seller's feed
5. POST /phyllo/import          -> products in their catalog
```

---

## `POST /phyllo/connect-token`

Mints the short-lived token the Phyllo Connect SDK needs. Call it each time the seller opens the connect screen — do not cache it.

```json
{
  "message": "Connect token created",
  "sdkToken": "eyJ0eXAiOiJKV1Qi…",
  "phylloUserId": "9546b4fe-cef7-48c4-ab9f-960dd0080728",
  "expiresAt": "2026-09-11T17:37:27.525002",
  "workPlatformId": "9bb8913b-ddd9-430b-a66a-d74d846e6c66"
}
```

`workPlatformId` is Instagram's id — pass it to the SDK so it opens Instagram directly instead of the platform picker. **Do not hardcode it in the client**; it is sent so it lives in one place.

| Status | Meaning |
|---|---|
| 200 | Token created |
| 401 | Not authenticated |
| 502 | Phyllo is unreachable, or the API is missing its Phyllo credentials. Retryable — show "try again", not "something went wrong with your account". |

---

## `GET /phyllo/account`

The seller's connection state, read live from Phyllo (not from a cached row), so this is the endpoint to poll after the SDK closes.

```json
{
  "message": "Instagram account status retrieved",
  "connected": true,
  "status": "CONNECTED",
  "phylloAccountId": "44554e73-5879-4764-a37c-fa3a47e25c2a",
  "platformUsername": "la_tienda_de_ana",
  "lastSyncedAt": "2026-09-04T18:22:10.001Z"
}
```

`status` drives four genuinely different screens — **do not collapse them into a boolean**:

| status | What to show |
|---|---|
| `PENDING` | "Connect your Instagram" — they have never started |
| `CONNECTED` | The feed |
| `NOT_CONNECTED` | They disconnected, or never finished. Same CTA as `PENDING`. |
| `SESSION_EXPIRED` | **"Reconnect your Instagram"** — the link exists but Instagram's token lapsed. Telling them to *connect* here is confusing; they already did. |

`connected` is a convenience and is `true` only for `CONNECTED`.

---

## `GET /phyllo/posts`

Refreshes the cached feed from Phyllo and returns it, newest first. One page of up to 50 posts — there is no pagination yet.

```json
{
  "message": "Instagram posts retrieved",
  "posts": [
    {
      "contentId": "ab5eadc8-e8c2-46f9-b000-f5a70bc0b5a8",
      "title": "Blusa de lino",
      "description": "Blusa de lino\nDisponible en 3 colores",
      "format": "IMAGE",
      "url": "https://www.instagram.com/p/CWTeRhIvA4X/",
      "publishedAt": "2026-08-30T00:00:00.000Z",
      "previewUrl": "https://scontent.cdninstagram.com/v/…",
      "imported": false,
      "itemId": null
    }
  ]
}
```

**`previewUrl` is a signed link that expires within hours.** Render it in an `<img>` and nothing else — never write it to state that outlives the screen, never send it back to the API, never store it against an item. The product image an import creates is a copy in Alkachof's own storage and has nothing to do with this url. A refetch of this endpoint gives fresh links.

`imported: true` means the post already became a product (`itemId` is that item). Show it as done and disable selection — a second import of the same post is refused.

`format` is `IMAGE` / `VIDEO` / `AUDIO` / `TEXT` / `OTHER`. A `VIDEO` imports through its thumbnail, which is what `previewUrl` already shows.

| Status | Meaning |
|---|---|
| 200 | Feed returned (possibly empty) |
| 400 | `"No Instagram account is connected"` — send them back to the connect screen |
| 502 | Phyllo unreachable — retryable |

---

## `POST /phyllo/import`

Turns selected posts into products. **Max 10 per call.**

```json
{
  "posts": [
    { "contentId": "ab5eadc8-…" },
    { "contentId": "65c3f449-…", "name": "Blusa premium", "description": "Lino 100%", "price": 1999 }
  ]
}
```

- `contentId` is **required and is the only identifying field**. The image, the account and the catalog are all resolved server-side. The API will not accept a media url or an image url, and adding one to the request does nothing.
- `name` — defaults to the caption's first line, trimmed to 100 characters.
- `description` — defaults to the full caption.
- `price` — **integer cents** (`1999` = $19.99). Omitted means `0`; the seller prices it afterwards, same as any unpriced item. A numeric string (`"1999"`) is accepted.

### The response reports partial success

**201 does not mean every post landed.** Each selection appears in exactly one list:

```json
{
  "message": "Instagram posts imported",
  "imported": [ { "contentId": "ab5eadc8-…", "item": { "_id": "…", "name": "Blusa de lino", "price": 0, "imgPath": "https://…/img/…webp" } } ],
  "skipped":  [ { "contentId": "65c3f449-…", "reason": "That post has no downloadable image" } ]
}
```

Show `imported.length` as the success count and list `skipped` with its reasons. Reasons a client should expect:

| reason | Meaning |
|---|---|
| `That post has already been imported` | Someone (or another tab) got there first — refetch the feed |
| `That post is not in this seller's imported feed` | Stale client state — refetch the feed |
| `That post has no downloadable image` | Its media expired or was unreachable; refetch the feed and retry |
| `Max items reached` | The catalog is full. Everything after it is skipped for the same reason. |

Refetching `/phyllo/posts` after an import is the right move in every skip case.

### Whole-batch rejections

| Status | Meaning |
|---|---|
| 400 | `"Select at least one post to import"`, `"Too many posts selected for one import"` (>10), `"Each selected post must carry a contentId"`, or an invalid `price` — **nothing was created** |
| 403 | `"Max items reached"` — the catalog was already full before anything ran |
| 404 | `"Catalog not found"` — the seller has no catalog |
| 429 | Rate limited (this route shares the upload budget: 40 per 15 min) |

An import can take several seconds — each post is a download plus an image re-encode, done one at a time. Show progress and do not let the user fire a second import while one is in flight.

---

## `POST /phyllo/webhook`

**Not for clients.** Phyllo calls it; it is authenticated by an HMAC signature, not a JWT, and rejects everything else with 401.

---

## Not built yet

Deliberately out of scope, not oversights — ask before building around them:

- **Feed pagination.** One page of up to 50 posts. Older posts are unreachable.
- **Scheduled re-sync.** The feed refreshes only when `/phyllo/posts` is called.
- **Carousels.** A multi-image post imports as one product with one image.
- **A disconnect endpoint.** The seller disconnects inside Phyllo's SDK; `/phyllo/account` then reports `NOT_CONNECTED`.
- **Bulk re-import or un-import.** `imported` is one-way; deleting the item does not free the post.

## Operational note

Set `PHYLLO_CLIENT_ID`, `PHYLLO_CLIENT_SECRET` and `PHYLLO_WEBHOOK_SECRET` before this works in a deployed environment, and register the webhook url in the Phyllo dashboard. `PHYLLO_ENV=production` is required for real accounts — anything else uses the sandbox. Without `PHYLLO_WEBHOOK_SECRET` the webhook rejects everything (by design); the connect flow still works because `/phyllo/account` polls.
