# Request: a freshness signal for the news feed

**To:** API team · **From:** web client · **Re:** `followup.NewsApi.md`, `followup.LocalCacheApi.md`

The reworked news contract is implemented in the client: `{ news }`, read-only, expiry
owned entirely by the server. One thing is deliberately *not* done, and this is the ask
to make it possible.

**Today `GET /news` is fetched on every mount of Home's *Mis cosas* panel and is not
cached at all** — not on React Query, not in `PERSISTED_KEYS`. That is correct, and the
handoff says so, but it is the only read on this screen still paying full price on every
visit. We would like news to join the cache system the way a subscribed catalog has, and
it cannot until there is something to gate it with.

## What we need

The same shape as `GET /updated/{catalogId}`: one cheap, unauthenticated-or-cheap read
that answers *"has anything about the news feed changed?"* without sending the feed.

```
GET /news/updated  →  200  { "updated": "2026-09-09T17:08:32.457Z" }
```

One global stamp for the whole feed is enough — there is one feed and every user sees the
same one, so per-row stamps would buy nothing. It must move on **all four** events:

| Event | Why it must move the stamp |
|---|---|
| An announcement is published | the new row has to appear |
| An announcement is edited | the body a user already read has changed |
| An announcement is retracted (`deleted: true`) | **the important one** — see below |
| An announcement passes its `duration` | expiry is invisible to us otherwise |

That last row is the awkward one, because nothing *happens* at expiry — no write, no
request. If the stamp is stored, it has to be recomputed to account for the next row due
to expire; if it is derived at read time (e.g. `max(updatedAt)` across live rows, or the
earliest pending expiry folded in), that falls out naturally. **We do not need to know
which of the four happened**, only that the answer differs from the one we hold.

Please keep the two properties that make the catalog stamp work:

- **A never-fetched or empty feed answers `200` with the epoch**, not `404`. It is a
  comparison token, not a lookup — we compare for inequality (`!==`, never ordering), so
  a stamp that steps backward self-heals instead of pinning us to stale data.
- **Small and cheap.** ~80 bytes and no feed body, so asking is always cheaper than
  fetching.

## Why it matters

Retraction is the reason this is a request rather than a nice-to-have. `deleted: true` is
how an admin pulls an announcement that should not have gone out — wrong dates, wrong
prices, an outage notice for an outage that did not happen. Any client-side caching we add
*without* a stamp keeps serving that announcement to exactly the population it was pulled
from: for a `gcTime` if we put it on React Query, and indefinitely, across sessions, if we
persist it. That is the failure the owner-catalog note in `queryPersist.tsx` describes,
with a worse blast radius, because an announcement is global.

So the choice today is between an uncached feed and a cache that can defeat a retraction,
and we have taken the first. A stamp turns it into neither.

## What we shipped in the meantime

Nothing clever, on purpose:

- `fetchNews()` is called by `useAsyncSection` on first open of *Mis cosas* — one fetch
  per mount, into component state.
- News is **absent from `src/lib/queryKeys.ts`**, which is the closed list of what this app
  caches, with the reasoning recorded there rather than in a commit message.
- News is **absent from `PERSISTED_KEYS`** in `src/lib/queryPersist.tsx`, likewise noted.
- No client-side date arithmetic anywhere. `duration` is not sent and we do not want it:
  the server is the only thing that decides what is live.

The cost is one request per Home visit for a feed that changes a few times a month.

## When it lands

The client side is small and modelled on `usePublicCatalogFreshness`:

1. `queryKeys.news()` plus a `newsStamp()` / `newsSynced()` sibling pair, with the same
   rule that the synced stamp is stored *with* the payload.
2. `refetchOnMount: true` on the stamp query, so a cold start always asks the server; the
   payload itself refetches only when the two stamps differ.
3. Only then, `queryKeys.news()` goes into `PERSISTED_KEYS` — gated, the way a subscribed
   catalog is.

Until step 1 exists on the API, the TODOs in `fetchNews.ts` and `queryKeys.ts` point here
and the feed stays uncached.
