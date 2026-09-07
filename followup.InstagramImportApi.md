# Instagram import — API contract

Backend for turning a seller's Instagram photos into catalog products, via
**Apify's Instagram scraper**. Engineering detail lives in `CLAUDE.md` §V; this
file is what the web client needs.

Base path `/instagram`. Every endpoint needs `Authorization: Bearer <accessToken>`.

## Why it works this way

Instagram's Basic Display API was retired in December 2024, and the Graph API
that remains reads media only for Business/Creator accounts linked to a Facebook
Page. Alkachof's sellers are on ordinary personal accounts, so the previous
Phyllo integration could not reach them. The API now reads **public profiles**.

Three properties follow, and the client must be built around all of them:

1. **A private account cannot be read at all.** Enrollment refuses it (422), and
   the seller has to change a setting on Instagram before anything works.
2. **Ownership cannot be proven.** No OAuth vouches for anyone. The control is an
   attestation the seller signs, recorded against their row, plus the fact that
   **enrollment is permanent**: one account, no switching, no unlink endpoint.

3. **Every read costs money.** Apify bills per actor run, and nothing about a
   request bounds how often a seller makes one — before the cooldown existed, an
   enrolled seller could reopen the import dialog and pay for another run
   immediately, indefinitely. So a **successful import holds the seller's next
   run for `cooldownDays`** (7), recorded on `ig_details.nextAvailable`. See
   *The import cooldown* below; it changes what `/status` returns, adds a 429 to
   two endpoints, and imposes one thing the UI must say.

That permanence is also the security boundary. There is no
`GET /instagram/posts?profileId=…` and there never may be — the account is
resolved server-side from the token, so "read someone else's feed" is not a
request this API can express. `/instagram/search` is the one endpoint that takes
a handle, and it is refused the moment a seller is enrolled.

## Flow

```
first time                              already enrolled
──────────                              ────────────────
1. GET  /instagram/status  {enrolled:false}   1. GET /instagram/status {enrolled:true}
2. GET  /instagram/search?q=…  -> candidates  2. GET /instagram/posts
3. seller picks one, ticks the attestation    3. POST /instagram/convert
4. POST /instagram/enroll
5. GET  /instagram/posts
6. POST /instagram/convert
```

---

## `GET /instagram/status`

Whether this seller has linked an account, and whether they may import now.

```json
{
  "message": "Instagram enrollment status retrieved",
  "enrolled": true,
  "available": false,
  "nextAvailable": "2026-09-13T18:00:00.000Z",
  "cooldownDays": 7
}
```

**This is the whole response**, and the only thing here about the stored row is
*whether* it exists and *when* the seller may next run the scraper. The linked
handle and profile id are never returned by any endpoint — `ig_details` is not
public. A UI cannot show "conectado como @x" and must not try.

`available` is computed server-side; never re-derive it from `nextAvailable`
against the browser clock. `nextAvailable` is null when nothing is holding the
seller. `cooldownDays` is the policy — render the warning from it rather than
hard-coding 7, or the copy drifts from the gate the next time it is tuned.

**This is the only unmetered endpoint here, so call it before offering the
feature.** It costs one mongo read and saves the seller a screen that could only
refuse them. It is the courtesy, not the control: the gate is enforced on the two
endpoints below, and a client that skips this just meets the 429 one screen
later.

---

## `GET /instagram/search?q=<handle>`

Resolves the seller's account for the enrollment picker, by running Apify's
**profile scraper**. **Expect seconds, not milliseconds** — show real progress.

**This is an exact-handle lookup, not a search.** The actor takes usernames, not
search terms, so `profiles` holds **zero or one** entry — a partial or misspelled
name resolves to nothing. Word the UI accordingly: ask for the username as
Instagram spells it, and treat an empty list as "no such account", not "no
matches". The array shape is kept so a by-name lookup could be added later
without a breaking change.

```json
{
  "message": "Instagram profiles retrieved",
  "profiles": [
    {
      "profileId": "17841400000001",
      "alias": "la_tienda_de_ana",
      "fullName": "La Tienda de Ana",
      "avatarUrl": "https://…/ana.jpg",
      "isPrivate": false,
      "isVerified": false,
      "postCount": 14
    }
  ],
  "attestation": {
    "version": "1.0",
    "template": "Soy el dueño/a o administrador de la cuenta {instagram_account}. …",
    "placeholder": "{instagram_account}"
  }
}
```

Profile metadata only — never posts, never media. The actor also returns up to 12
`latestPosts`; the API does not forward them, because the feed comes from the
post actor's bounded run.

**`attestation` is the sentence the client must display**, with `placeholder`
replaced by the chosen `@alias`. Render it; never compose your own. The client
sends back a boolean, not text — the server stores the wording it served, and
that record is what a suspension is defended with.

An `isPrivate` result should be shown **disabled with the reason**, not hidden:
hiding it makes the seller think their account was not found.

| status | meaning |
|---|---|
| 400 | empty query |
| 409 | already enrolled — this endpoint is closed for good. Go to the feed. |
| 502 | scraper unreachable. Retryable. |

---

## `POST /instagram/enroll`

Links the account. **Irreversible.** There is no endpoint to switch or unlink;
correcting a mistake needs support.

```json
{ "profileId": "17841400000001", "alias": "la_tienda_de_ana", "attested": true }
```

`attested` must be `true` — the server refuses a default. The `{profileId, alias}`
pair is **re-resolved server-side** rather than trusted, so the attestation cannot
name one account while the row points at another.

```json
{ "message": "Instagram account linked successfully", "enrolled": true }
```

201. Echoes nothing back.

| status | reason | what the client should do |
|---|---|---|
| 400 | attestation missing | unreachable from a correct UI — log it |
| 400 | profile mismatch | send the seller back to search |
| 404 | handle no longer resolves | back to search |
| 422 | **account is private** | terminal screen, no retry — explain the Instagram setting |
| 409 | already enrolled | go to the feed; probably another tab |
| 502 | scraper unreachable | retryable |

---

## `GET /instagram/posts`

The seller's feed, newest first, from Apify's **post scraper**. **Takes no
parameters** — the account comes from the token via `ig_details`.

```json
{
  "message": "Instagram posts retrieved",
  "posts": [
    {
      "externalPostId": "3200",
      "caption": "Blusa de lino\nDisponible en 3 colores",
      "mediaType": "IMAGE",
      "permalink": "https://www.instagram.com/p/Cabc123/",
      "publishedAt": "2026-09-01T10:00:00.000Z",
      "mediaUrl": "https://scontent.cdninstagram.com/…",
      "isConverted": false,
      "convertedItemId": null
    }
  ]
}
```

**`mediaUrl` is a CDN link that expires.** Render it in an `<img>` and nowhere
else — never persist it, never send it back, never store it against an item. The
imported product's image is a separate copy in Alkachof's storage.

One bounded page of up to 100 posts. **There is no pagination.** The scraper has
no resume cursor into Instagram, so a "next page" would be a second full run
re-scraping from the top. Calling this again refreshes the whole page.

**This is the billed call.** One actor run per request, gated on
`nextAvailable` — the check runs *before* the actor, so a refusal has not already
paid for the run it refuses.

| status | meaning |
|---|---|
| 400 | not enrolled — send them to the wizard |
| 429 | **cooldown** — already imported this period. Terminal, not retryable; body carries `availableAt`. |
| 502 | scraper unreachable. Retryable. |

---

## `POST /instagram/convert`

Turns selected posts into products. Max 10 per call; each is a download plus an
image re-encode, done one at a time, so this runs for seconds.

```json
{ "posts": [{ "externalPostId": "3200" }] }
```

`externalPostId` is the only field that decides anything — the image, the account
and the catalog are all resolved server-side. Optional `name` and `description`
override the defaults; `price` defaults to 0.

```json
{
  "message": "Instagram posts converted to products successfully",
  "imported": [{ "externalPostId": "3200", "item": { "_id": "…", "name": "Blusa de lino", "price": 0, "imgPath": "…" } }],
  "skipped": [{ "externalPostId": "3201", "reason": "That post has already been imported" }],
  "nextAvailable": "2026-09-13T18:00:00.000Z"
}
```

**201 does not mean everything landed.** Every selection returns in exactly one
of the two lists. Show both, and translate the reasons — they are English and
internal.

**`nextAvailable` is non-null exactly when this import started a cooldown**, i.e.
when `imported` is non-empty. Refetching the feed used to be the right move after
every skip reason; it still is, but a successful import is precisely what blocks
that refetch for a week. So when this field is set, show the date instead of
inviting a retry the API will refuse. It is returned here so the client need not
hold its own copy of the cooldown length.

A post whose image cannot be copied is skipped, never created pointing at the
remote url: those links expire, so such an item would look right on import and go
blank later on a public catalog page.

| status | reason |
|---|---|
| 400 | nothing selected, too many, or not enrolled |
| 403 | catalog full |
| 404 | no catalog |
| 429 | **cooldown**, or the shared upload budget (40 per 15 min). Both carry `availableAt`; the date is the only thing worth showing either way, so one handler covers both. |

---

---

## The import cooldown

Apify bills per actor run. `/posts` is one run; `/search` is one more. Nothing in
a request bounds how often a seller triggers them, and before this existed a
seller could import, reopen the dialog, and pay for another run immediately — an
unbounded per-seller cost, invisible until the bill arrived.

**A successful import holds the seller's next run for `cooldownDays` (7).**
`ig_details.nextAvailable` records the date; `/status` reports it; `/posts` and
`/convert` refuse with 429 until it passes.

Four properties to build against:

- **Only a *successful* import starts it** — one that created at least one item.
  A run that imported nothing (every post already converted, every media url
  expired) spent the seller's allowance on our failure, so they keep their next
  one. `nextAvailable` on the 201 tells you which happened.
- **It is per seller and week-long, not a rate limiter.** The IP limiters in
  `middleware/rateLimit.js` are in-memory, reset on restart and do not span
  instances — right for a burst, useless for a budget. This is a stored date.
- **`/search` is not gated, and does not need to be.** It is refused the moment a
  row exists, so it is already once-per-account for life.
- **The client must say so *before* the seller imports.** This is the one UI
  requirement the cooldown imposes rather than merely permits. A seller gets one
  pass per week, so the photos they leave unselected wait a week; telling them
  that on the screen *after* the choice is telling them too late.

A 429 here is **terminal, not retryable**. The wait is days long, so the screen
that reports it carries the date from `availableAt` and offers no "Reintentar" —
a button whose only function is to fail. Same shape as the private-account
screen, for a different reason.

`nextAvailable` defaults to now, so enrollment never begins with a wait. Rows
written before the field existed carry no value at all and read as available —
mongoose defaults apply at creation, not on read — so there is nothing to
backfill.

---

## Not included

- **A disconnect or switch endpoint.** Deliberate — see permanence above.
- **Reading the linked handle back.** Deliberate — `ig_details` is not public.
- **Pagination.** See `/instagram/posts`.
- **Scheduled re-sync.** The feed refreshes only when `/instagram/posts` is called.
- **An endpoint to clear a cooldown.** Deliberate. Correcting one is a direct
  `ig_details` write, the same as correcting a wrong handle.
- **A gate on feed reads *before* a seller's first import.** Known gap, not an
  oversight: `nextAvailable` moves only on a successful import, so a seller who
  never imports can still re-read the feed repeatedly, each read a billed run.
  The web client removed its refresh button, so the reachable path is now closing
  and reopening the import dialog — narrower, not closed. Bounding it needs a
  second rule (a per-seller daily cap on `/posts`, say), which is a separate
  decision from this one.

## Configuration

`APIFY_TOKEN` must be set before this works in a deployed environment. Two actors
do the work, configured separately: `APIFY_PROFILE_ACTOR_ID`
(`apify/instagram-profile-scraper`) resolves the identity, `APIFY_POST_ACTOR_ID`
(`apify/instagram-post-scraper`) reads the feed. Without a token the endpoints
answer 502 and the rest of the API is unaffected. `APIFY_MAX_RESULTS` (default
100) bounds posts per run — every run is metered, so it bounds cost per seller
too. The cooldown length is a code constant, not an env var:
`CONSTANTS.INSTAGRAM.IMPORT_COOLDOWN_DAYS`, served to clients as
`status.cooldownDays`.
