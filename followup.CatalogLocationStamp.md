# Request: bring the catalog Location under the freshness stamp

**To:** API team · **From:** web client · **Re:** `followup.LocalCacheApi.md`

`GET /updated/{catalogId}` shipped and the web client is using it: a returning
visitor now pays one ~80-byte stamp read instead of re-fetching a shop that has not
changed. One thing is left outside it, and that document already names it:

> **Still not covered: the catalog's Location** (`/location/catalog/{catalogId}`).
> Editing it does *not* move the stamp today. If `CatalogLocationDialog` renders
> from a cached location, keep fetching that one normally until this is wired up —
> it is a small backend change, ask for it.

Asking for it.

## What we need

Move the stamp on the two endpoints that write a location, exactly as the eight
writes in *What moves the stamp* already do:

| Change | Endpoint |
|---|---|
| Location created | `POST /location/catalog/{catalogId}` |
| Location updated | `POST /location/{locationId}/update` |

The update route takes a `locationId`, not a `catalogId`, so it needs the row's
`catalogId` to know which stamp to move — the location document already carries it.

Nothing else changes: same response shapes, same stamp semantics, same
`Cache-Control`. If a location can be deleted through an endpoint we have not seen,
that should stamp too.

## Why it matters more than the size of the change suggests

A location is a **street address a buyer navigates to**. It is the one piece of
cached shop data whose staleness has a cost in the physical world — every other
field is a wrong price or a missing photo, visible and self-correcting. A seller
who fixes a wrong address needs that fix to reach people.

It is also the one field the current gate is structurally blind to. Because
editing a location moves nothing, a client that cached it under the stamp would
serve the old address until some *unrelated* change — a new item, a question —
happened to move the stamp. That is worse than not caching it: it looks correct
and is not.

## What we shipped in the meantime

The location is cached, but **bounded by time rather than by the stamp**, and the
bound is deliberately conservative:

- `staleTime` of **5 minutes** in `useCatalogLocation`, so repeat views inside a
  session are free and a corrected address still reaches a browsing visitor.
- **Never persisted.** `queryPersist` allows only the `public` and `synced`
  scopes onto disk, so the window can never span a reload — a cold start always
  re-reads the address.
- The freshness gate *does* invalidate the location when the stamp moves for any
  other reason. Belt and braces: a seller who moved their shop probably changed
  something else too. It is not a guarantee and is not treated as one.

So nothing is broken today. What we are paying is one request per visit that the
stamp was supposed to remove, plus a 5-minute window in which a corrected address
is still wrong.

## What we will do when it lands

Delete `LOCATION_STALE_MS`, move `queryKeys.catalogLocation` under the
`['catalog','public',catalogId]` prefix so the existing gate covers it, and add
the `location` scope to the persistence allowlist. Roughly a ten-line change, all
of it deletion — the seams are already in place and commented.

Please tell us when it ships so we can drop the workaround rather than leaving a
time bound in the code that nobody remembers is a workaround.

## One thing to confirm

`followup.LocalCacheApi.md` says a rejected write must **not** stamp. Same here: a
location update that fails validation should leave the stamp alone, or every
failed save would invalidate a shop for all its visitors.
