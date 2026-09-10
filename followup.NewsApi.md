# Follow-up: News Feed (Admin Announcements) — Frontend Handoff

This document hands the reworked **News** contract to the web client. It mirrors the OpenAPI
definitions live in Swagger (`/api-docs`, non-prod only). API-side detail, including how an
announcement gets published at all, lives in `alkachof-api/followup.NewsApi.md`.

> **Three things changed at once, 2026-09-09.** Read all three before touching anything:
>
> 1. **The entity and the wire shape were renamed** `adminMessage` → `news`. `GET /news` returns
>    `{ news: [...] }`, not `{ adminMessages }`.
> 2. **Announcements now expire on their own**, via a server-side `duration`.
> 3. **The write endpoints are gone.** `POST /news/create`, `/news/{id}/update` and
>    `/news/{id}/delete` answer **404**. There will be no admin UI for this.
>
> **The API and this client must deploy together.** An old client against the new API reads
> `data.adminMessages` and gets `undefined`.

## What is already done in this repo

The rename is **already applied in the working tree** (uncommitted at the time of writing) across
seven files — `fetchNews.ts`, `mockFetchNews.ts`, `NewsList.tsx`, `NewsDetailDialog.tsx`,
`MisCosasPanel.tsx` and two test files. The type `AdminMessage` is now `News`, and
`fetchNews.ts` reads `data.news`. `tsc --noEmit` is clean and the 31 home tests pass.

**Nothing else is required for the duration feature.** The server decides what is live and sends
only live rows; the client renders what it is given. There is no client-side date arithmetic to
write — see *Caching*, below, for the one way this can still go wrong.

## The model

```ts
export type News = {
  _id: string
  /** Publication time (UTC ISO-8601), set by whoever published it. */
  date: string
  title: string
  /** Plain-text body — render as text, never as HTML. */
  message: string
}
```

That is the whole shape. No image, no author, no category, no read/seen state, **and no link**.

**`duration` and `deleted` exist on the server and are deliberately never sent.** They decide
whether a row is served at all; once you have been served it, they tell you nothing. Do not ask for
`duration` to be added so a card can show a countdown or hide itself — the server is the only thing
that decides what is live, and a client that re-implements the window will drift from it.

### A news card is not a notification

They look alike on the dashboard by design, but they are different objects:

| | Notification | News |
|---|---|---|
| Scope | one user | every user |
| Delivery | socket push (`notification:new`) + REST | REST pull only |
| Link | `metadata.navigationUrl`, tap navigates | **none** — tap opens a modal with the full text |
| Seen state | yes | no |
| User can delete | yes | **no** |
| Lifetime | until deleted | expires on its own |

The whole `message` is in the list payload, which is why the modal needs no second fetch. Do not add
a `navigationUrl` to a news card, and **do not add a trash button** — `NewsList.tsx` has never had
one and `NewsList.test.tsx:26` asserts it stays that way. There is no per-user copy of an announcement to delete,
so a dismiss control would either lie or delete it for everybody.

## The contract

**Auth: both endpoints require `Authorization: Bearer <jwt>`.** Any logged-in user may read. There
is no admin surface.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/news` | Live announcements, newest first |
| `GET` | `/news/{newsId}` | One announcement, if it is still live |

### `GET /news`

```json
{
  "news": [
    { "_id": "…", "date": "2026-08-11T17:08:32.457Z", "title": "…", "message": "…" }
  ]
}
```

- Newest first, by publication date. Sorted server-side; do not re-sort.
- An empty feed is `{ "news": [] }` with **200**, never 404. Render nothing — not an error state.
- The list **shrinks on its own** as announcements expire. A row present on one fetch can be absent
  from the next with nothing having failed. Never treat a shorter feed as an error.

### `GET /news/{newsId}`

```json
{ "news": { "_id": "…", "date": "…", "title": "…", "message": "…" } }
```

**404 covers four cases and does not distinguish them:** unknown id, malformed id, retracted by an
admin, and past its duration. Show one "this announcement is not available" state for all four;
there is no distinction worth surfacing, and the API deliberately gives you none.

> **This endpoint currently has no caller.** `NewsList` renders its modal from the list it already
> holds (`NewsList.tsx:61` → `NewsDetailDialog`), which is the right design — the body is already in
> hand. The endpoint exists for a future deep link or admin view. **Unused is not dead:** do not
> remove it, and do not start calling it just because it exists.

## Caching — the one way `duration` can be defeated from here

The server can only decide what is live *at the moment of a fetch*. A cached feed keeps rendering
whatever it captured, so **client caching is what determines whether an expiry is ever observed.**

**Today this is correct, and it is correct by accident rather than by design — so it is easy to
break.** News is loaded by `useAsyncSection` (`HomePage.tsx:68`) into component state, on first open
of the *Mis cosas* panel. It is **not** on React Query and **not** in `PERSISTED_KEYS`. Practical
effect: one fetch per mount, and an announcement that expires mid-session keeps rendering until the
next page load. That is acceptable and needs no fix.

Two changes would silently break it:

- **Moving news onto React Query without an explicit `staleTime`.** This client's defaults are
  `staleTime: Infinity` and `gcTime: 24h` (`src/lib/queryClient.ts`), chosen for data that changes
  only when the user changes it. News changes on a clock nobody here can see, so it would render an
  expired announcement for up to a day. If you move it, give it a real `staleTime` and a reason,
  the way `queryClient.ts` asks.
- **Adding news to `PERSISTED_KEYS`.** This is the worse one. A persisted list never refetches, so
  an expired — or *retracted* — announcement would render **indefinitely, across sessions**. That is
  precisely the failure the owner-catalog note in `queryPersist.tsx` describes. Subscribed catalogs
  are only safe on disk because `GET /updated/:id` gates them; **news has no equivalent freshness
  stamp**, so there is nothing to gate it with. Do not persist it.

The retraction case is why this matters beyond tidiness: `deleted: true` is how an admin pulls an
announcement that should not have gone out, and a persisted cache would keep showing it to the
people it was pulled from.

## What is obsolete — the HTTP CRUD

`POST /news/create`, `POST /news/{id}/update` and `POST /news/{id}/delete` **no longer exist**. They
answer 404 with a valid admin token, and the API's route test asserts exactly that.

The reason is blast radius, not tidiness. An announcement is delivered to **every user at once**, so
a write path reachable with an admin token is a way to broadcast to the entire user population with
one stolen credential. At the product's current size that trade is not worth making. Announcements
are inserted by a sysadmin directly against the database instead.

For this client that means:

- **Do not build an admin composer, editor or delete control**, and do not scaffold one "for later".
- **Do not add news mutations to `api.definitions.md` or to any action file.** There is no endpoint
  to call.
- If an admin site is ever built it is a separate product decision with its own design for who may
  publish and how a bad announcement is pulled back — not a UI added on top of this contract.

The only client-visible consequence: a user can never dismiss, hide or delete an announcement. It
leaves when its duration runs out, and not before.

## Checklist

- [x] `AdminMessage` type renamed to `News`
- [x] `fetchNews.ts` reads `data.news`
- [x] Mocks and tests updated; `tsc --noEmit` clean
- [ ] Commit and deploy **in step with the API** — an old client here breaks on the new response key
- [x] Confirm nothing new persists or long-caches the feed (see *Caching*) — the absence is now
      recorded in `queryKeys.ts` and `queryPersist.tsx`, and `followup.NewsCacheStamp.md` is the
      ask for the stamp that would make caching it safe
- [x] Confirm no admin composer exists or is planned — none exists; `fetchNews.ts` says why
