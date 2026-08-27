# Frontend handoff — Catalog QR Code

Every catalog has a permanent, scannable QR code pointing new visitors at the shop. It is a **plain
public image url on the catalog object** — there is no QR endpoint to call.

> **If you built against an earlier draft of this API, this is the change.** `GET /catalog/qr`
> (which returned raw PNG bytes behind auth) and `POST /catalog/{catalogId}/qr/regenerate` are
> **both deleted**. Any blob-fetch / object-URL code written for them can be thrown away — it is now
> an `<img src>`. There is no longer any reason to fetch a blob, and no `apiBlob` helper is needed.

## Reading it

`catalog.qr` — a url, alongside `catalog.image`. It comes back on the catalog you already fetch:

| Where | Who |
|---|---|
| `GET /catalog` | the owner's own catalog |
| `GET /catalog/{catalogId}` | anyone (public) |

```tsx
{catalog.qr && <img src={catalog.qr} alt="QR de tu catálogo" />}
```

That is the whole integration. No auth header, no blob, no object URL, no lifecycle to manage.

**The field can be absent.** A catalog reads back with no `qr` until its code has been generated, so
guard on it and render your empty state rather than an `<img>` with `undefined`. In practice the
owner's first `GET /catalog` mints it, so a missing url on the owner's own dashboard should be a
transient one-refresh thing, not a steady state — but it is not guaranteed, so handle it.

**The url is stable.** A code is generated once and its url never changes afterwards, so it is safe
to cache, and the browser will.

## There is no way to regenerate or delete a code

No endpoint, deliberately — a seller re-minting their own code would silently invalidate every
sticker and card they had already printed. If a code genuinely has to be replaced, that is a backend
operation today. Do not build a "refresh QR" affordance.

## What scanning it does

The code encodes `<origin>/join?catalogId=<id>` — **not** a link to `/catalog/<id>`. A scan is a cold
arrival (someone in front of a shop with no account, no context), and `/join` exists to give them a
landing moment before the catalog itself.

Three constraints on the web client become permanent the moment a code is printed:

1. **`/join` may never 404.** Redesign it freely; if it is ever retired, retire it into a **permanent
   redirect**, or every code in the field goes dead.
2. **The query param stays `catalogId`.** A rename breaks only *old* codes while new ones keep
   working — the failure shape nobody notices until a seller says their sticker stopped working.
3. **`/join` must survive an unknown or deleted `catalogId`** with a friendly "this shop is no longer
   here" screen, never a crash or a blank page. Paper outlives catalogs.

None of this is enforced by any backend test. It is a contract the client holds up on its own.

### Dev vs. production codes

The encoded origin comes from the API's `QR_REFERENCE_URL`, so a dev API can mint codes pointing at
the dev client and the scan path is testable end to end. The flip side: **a code generated against a
dev API is a dev code, permanently** — never print or share one.

## Where to put it

A "My Shop" / dashboard screen, near wherever the catalog's presentation image
(`followup.CatalogImageApi.md`) is managed — both are owner-facing assets set once and rarely
touched. `ShareCatalogDialog` is a natural home: it is already the "get your shop in front of people"
surface and currently offers only *copy link*; the QR is the same intent for the physical world.

A **download** affordance is just `<a href={catalog.qr} download="qr.png">`.

The PNG is **1024×1024**, which holds up at sticker and small-poster sizes.

## Designing around it

**Free:** size, framing, background, border, caption, placement, surrounding copy.

**Fixed, and worth knowing before you design:**

- **The code is plain — no logo, no colour, no rounded modules.** The overlay was descoped; this is
  the finished look, not a placeholder. Do not leave a hole in the centre for a logo to appear in
  later, and do not re-render it through a filter — anything that softens the module edges or drops
  contrast costs scannability, which is the only thing this image is for.
- **Keep a quiet margin around it.** The PNG ships with a 2-module quiet zone, the practical floor.
  Bleeding it to the edge of a dark card is the classic way to make a valid code unscannable.
- **No SVG**, so avoid designs that need it to scale to a full-page poster.

If the logo is ever revived, newly generated codes would get it but **codes already in the field
would not** — flagged so a plain code isn't reported as a bug.

## Not included (ask before assuming otherwise)

- No vector/SVG output.
- No per-item QR codes, no scan analytics or attribution param on the URL.
- No `Content-Disposition: attachment` variant — `download` on the anchor is enough.
