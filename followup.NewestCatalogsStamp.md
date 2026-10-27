# Request: make the newest-shops stamp cover the display data it serves

**To:** API team · **From:** web client · **Re:** `docs.NewestCatalogs.frontend.md` §4

`GET /newest` and `GET /newest/updated` shipped and the web client is using them
exactly as the handover describes: the list is held in `localStorage`, the stamp
is read on mount and on focus, and the rows are refetched only when it moves.

We found a second blind spot in the stamp, and it is on a path every new seller
walks. `docs.NewestCatalogs.frontend.md` §4 names one — *a removal cannot move a
maximum forward* — and the client carries the agreed time bound for it. This is
the other one, and it is not a removal:

> **An edit to a listed catalog does not move the stamp either.**

## What happens

1. A seller verifies their phone. `userActivationService` calls
   `newestCatalogService.recordCatalog`, the row lands with a fresh `createdOn`,
   the stamp moves, and every client refetches. So far so good.
2. At that moment the catalog has **no `alias` and no `image`** — which
   `docs.NewestCatalogs.frontend.md` §5 is explicit is the normal case, and which
   the client renders through `publicCatalogName` and `CatalogThumb`'s
   placeholder. Every client now holds a row that says *"Catálogo en Alkachof"*
   and a placeholder picture.
3. The seller names their shop and uploads a photo. `catalogService.updateCatalog`
   and the image routes all `touchCatalog`, so `CatalogUpdated.updated` moves
   correctly — the shop's **own** page refreshes for its subscribers, as designed.
4. `getNewestUpdated` derives its stamp from `max(createdOn)` over the showcase
   rows. No `createdOn` changed, so **the showcase stamp does not move**, the
   client's gate sees no change, and the placeholder card stays on screen.

Nothing stale is ever *sent*: the display fields are joined at read time through
`catalogService` (the schema comment on `newestCatalogSchema` is right to refuse
to denormalise them), so a fresh `GET /newest` is correct the instant the seller
saves. What lags is only the client's decision to ask — the same shape as the
removal case, with a much higher hit rate.

## What we need

Derive the stamp from the display data as well as the recency:

```
updated = max(
  max(createdOn) over the showcase rows,
  max(CatalogUpdated.updated) over those rows' catalogIds
)
```

in **both** `getNewestUpdated` and the `updated` field of `getNewestCatalogs`, so
the two still describe the same moment.

`getNewestCatalogs` already holds the 25 ids — it builds `catalogIds` for the
batched candidate join. `getNewestUpdated` would need one more indexed read to
get them, then one `$in` over `catalogUpdated` sorted by `updated` desc, limit 1.
Two small indexed reads for the route that is meant to be polled, which is still
far inside what `Cache-Control: max-age=30` and the rate-limit exemption were
sized for.

Nothing else changes: same response shapes, same semantics, same `max-age`.

## Why this is not the thing you declined

`blueprint.NewestCatalogs.md` §5.3 records a decision we agree with:

> the API deliberately will not fabricate a stamp movement for a deletion,
> because a stamp two different causes can write is a stamp that starts
> disagreeing with its list.

This ask does not touch that. Three differences:

- **It is still derived.** No new write path, no stored stamp, nothing that can
  fail independently and silently stop moving. That property is why
  `getNewestUpdated` was derived in the first place, and it survives intact —
  `CatalogUpdated` is read, never written, by this change.
- **It is not a second cause; it is the same cause.** `CatalogUpdated.updated`
  already *is* the stamp for `alias` and `image`, which are two of the four
  fields `/newest` serves. The showcase is currently the one consumer of those
  fields that does not read their stamp. Reading it makes the stamp agree with
  its list more closely, not less.
- **The deletion case stays uncovered**, and the client keeps its time bound for
  it. We are not asking you to represent an absence.

## The side effect we accept

A listed shop gaining an item or a question also moves `CatalogUpdated.updated`,
so the showcase stamp will move for changes no card displays, and up to 25
clients' worth of `GET /newest` will be spent on an unchanged list. We would
rather pay that than hold a wrong card: the list is 25 rows of four fields, the
refetch is already gated behind the 30-byte stamp read, and the stamp stays
derived.

**Please do not solve it with a display-fields-only stamp collection.** A second
derived stamp with its own write hooks is precisely the independently-failing
write both sides agreed to avoid, and the thing it would save is a few kilobytes
on a route that is already cached for 30 seconds.

## What we have in the meantime

Nothing specific to this — the client is relying on the backstop that is already
there for removals, and it is a loose fit:

- The payload carries `staleTime: NEWEST_MAX_AGE_MS` plus a
  `refetchOnMount: true` override, so the placeholder card self-corrects on the
  next visit to Home's *Comprar* tab once the bound expires. **We have dropped
  that bound from an hour to 10 minutes** to narrow the window, which is the
  whole of what we can do from here.
- It also self-corrects, earlier and by luck, the next time **any** seller is
  activated: that moves `max(createdOn)`, and the refetch it triggers picks up
  every other row's current `alias` and `image` along with the new one.
- There is no manual refresh. `ComprarPanel` wires `onRetry` to the error branch
  only, so a user holding stale-but-present rows has no way to ask again — by
  design, and correct as long as the gate is trustworthy.

So a brand-new shop is advertised to the whole platform under a placeholder name
and a placeholder picture, including to the seller who just fixed it. On their
device the catalog editor and Home's *Mi catálogo* tile show the real name
immediately (they write `queryKeys.myCatalog()` from the mutation response), so
the showcase card one tab away is visibly, confusingly wrong. For a seller's
first ten minutes on the product, that card is the product.

**What the 10 minutes costs you**, so it is not a surprise in your traffic: the
bound now expires between most visits, so `GET /newest` is fetched on roughly
every mount of the Comprar tab rather than once an hour. That is ~6x the list
reads, on a list that changes a few times a day — we are paying it to cover a
case the stamp should cover, and the 30-byte `/newest/updated` read it was
supposed to replace is now largely redundant. It is the reason this ask is worth
your time rather than ours: fixing the stamp lets us put the bound back and makes
your cheap endpoint do the work again. We will raise it the day you ship.

## What we will do when it lands

Nothing. The gate already compares the stamp for inequality and refetches the
list, and `GET /newest` already returns its own `updated` as the baseline — so a
stamp that moves on an edit is picked up by the code that is deployed today, with
no client release. That is the nice part of this ask.

We will delete §4's claim that a removal is the stamp's *only* blind spot, and
raise `NEWEST_MAX_AGE_MS` from its interim 10 minutes back towards an hour, where
it only has to cover removals.

## One thing to confirm

A rejected write must not stamp — same rule as `followup.LocalCacheApi.md`. Since
this ask reads `CatalogUpdated`, that is already true wherever `touchCatalog` is
already correct; we only want to know that nothing in the showcase path adds a
new reason for the stamp to move. In particular: **a prune
(`scripts/pruneNewestCatalogs.js`) must still not move it.** Removing a row
changes which ids the max is taken over, which could step the stamp *backward* —
harmless for us, because the client compares with `!==` and never with `>`, but
worth you knowing it is load-bearing that we do.
