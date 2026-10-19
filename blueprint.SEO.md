# Blueprint — Findability (SEO, link previews, AI answers)

What a stranger learns about Alkachof without being sent a link, and what a
seller's shared link looks like when it lands.

**The promotion target is `app.alkachof.mx`.** That is the canonical host, the
address that gets ranked, shared and quoted. `alkachof.mx` is reserved for a
company site later and is not urgent — but it is not *inert* either, because the
page it serves today is the one the complaint was about (§3).

Written for a reader who has not done SEO before: each term is explained once
where it first matters.

## 1. What is actually served today

Measured 2026-10-16 against production — **before** the work in §13 landed. The
branch changes every row marked ✅ there; production still looks like this until
it deploys.

| URL | What it returns |
|---|---|
| `https://alkachof.mx` | Squarespace **parking page**. `<title>Coming Soon</title>`, `<meta name="robots" content="noindex">` |
| `https://www.alkachof.mx` | the same parking page |
| `https://www.alkachof.mx/join?catalogId=…` | **the same parking page** — the path is ignored |
| `https://app.alkachof.mx` | the SPA shell. `<html lang="en">`, `<title>Alkachof</title>`, no description, no canonical, no Open Graph |
| `https://app.alkachof.mx/robots.txt` | `index.html` (200, HTML) — the file does not exist |
| `https://app.alkachof.mx/sitemap.xml` | `index.html` (200, HTML) — the file does not exist |
| `https://app.alkachof.mx/version.json` | correct JSON — static files beat the `vercel.json` rewrite, which is why `public/` is a viable fix |

`grep` over `src/` finds **no** `og:`, no `twitter:`, no `document.title`, no
`name="description"`: there is no per-route metadata anywhere in the app.

### The reported symptom was accurate

The "under construction / Coming Soon" answer was not a hallucination — it is a
faithful reading of the page. `alkachof.mx` tells every crawler `noindex` ("do
not list this page") and the only sentence on it is "Coming Soon". An assistant
fetched it, read it correctly, and had nothing else to go on. **Nothing is
broken in search; search is reporting what we publish.**

### The two findings that set the order of work

**The promoted host has no public front door.** `/` is inside `ProtectedRoute`
inside `NavShell` (`src/router/AppRouter.tsx`), and `ProtectedRoute` returns
`<Navigate to="/login" replace>` when `!isAuthenticated`. A stranger at
`app.alkachof.mx` is sent to a login form. `/about` is the only public route
carrying product content. **Promoting a host whose root redirects to a login
wall cannot work**, and no amount of metadata changes it — §4.

**The brand's strongest search result is the engineering repo.** A search for
`alkachof` returns `github.com/chnt-gomez/alkachof-web-v3-min` (`"private":
false`) above the product, and the accurate description assistants give back —
"small-screen-first e-commerce platform for very small sellers in Latin America"
— is line 3 of `README.md`. See §9.

## 2. The three findability channels

`PRODUCT.md` says "distribution is a link the seller sends" and that there is
"no discovery marketplace" today. All three channels point at
`app.alkachof.mx`, and they fail for different reasons.

1. **A shared link or a QR code.** Live, carrying real traffic, and broken in
   two separate ways: printed codes land on a parking page (§3), and pasted
   links preview blank (§6). Fixing this channel pays out immediately because
   the traffic already exists.
2. **Assistant answers.** The channel the complaint came from. Cheap to win for
   an unknown brand, currently actively blocked (§7).
3. **Organic search.** Slowest, and the brand name collides with a common
   Spanish noun (§8). Real, but it pays out in months.

**All three are gated on the same technical fact**: crawlers that do not execute
JavaScript see an empty `<div id="root">`. That is §5, and it is the centrepiece
now that `app.alkachof.mx` is the target.

## 3. P0 — retire the parking page by redirecting the apex

`alkachof.mx` is not urgent as a *destination*, but the page sitting there is
the direct cause of the complaint, and it is also breaking the QR codes.
`guide.ProductionDeployment.md` §5.5 records **six minted QR codes** encoding
`https://www.alkachof.mx/join?catalogId=…`, with the instruction to add `www` to
Vercel as a path-preserving redirect. That step was never completed. **Every
scan of every printed code today lands on "Coming Soon."**

One change solves three problems at once:

> **301 `alkachof.mx` and `www.alkachof.mx` → `app.alkachof.mx`, preserving path
> and query.**

It kills the "Coming Soon" answer assistants are reading; it consolidates every
brand signal onto the host being promoted instead of splitting it across three
hostnames; and it makes the printed codes work, because
`www.alkachof.mx/join?catalogId=X` arrives at `app.alkachof.mx/join?catalogId=X`.

Add both domains to the Vercel project as redirects and delete the Cloudflare
records pointing at Squarespace. No code. Verify the exact printed URL, not the
bare host:

```bash
curl -sI "https://www.alkachof.mx/join?catalogId=6a0365fdf74fdcb617a8a5b6"
# expect 301/308 → https://app.alkachof.mx/join?catalogId=...
```

**This redirect is a placeholder, and it is correct only because of §4.** A
redirect from the apex to a host whose root is a login wall would be worse than
the parking page. Ship it together with the public front door, or after it.

When the company site is eventually built at `alkachof.mx`, un-redirect the
apex and give it its own content (company, pricing, press). That content does
not compete with the app, so the later split is clean — **but note the cost
being accepted**: a subdomain as the canonical brand home means that if the apex
ever becomes the primary brand address, that is a domain migration with its own
redirect map. Reversible, and your call — recorded here so it is not a surprise.

## 4. P0 — give `app.alkachof.mx/` a public front door

The blocking item. Today:

```tsx
<Route element={<ProtectedRoute />}>
  <Route path="/" element={<HomePage />} />   // → /login for a stranger
```

A promoted address has to answer "what is this?" to someone with no account.
Split `/` by authentication instead of gating it:

- **Signed in → `HomePage`**, unchanged. The dashboard stays exactly where
  sellers expect it, and no existing behaviour moves.
- **Signed out → a public landing page**, not a redirect.

Rules:

- **`AboutPage` is the content source, not a second page to maintain.** `/about`
  already exists, is public, and is the product pitch. Reuse its content at `/`
  and point `/about`'s `rel="canonical"` at `/` so the two are not competing
  duplicates of each other. (Its `SANDBOX_WORDS` list is placeholder copy per
  the `TODO(content)` — that is a content task, §8.)
- **Respect `isBooting`.** `ProtectedRoute` renders a skeleton while auth
  resolves. The `/` split must do the same rather than flashing the landing page
  at a signed-in seller on every cold start.
- **A guest at `/` gets the guest `NavShell` variant or no shell**, not the
  authenticated bottom tabs — the same distinction `/catalog/:catalogId`
  already makes.
- **Do not `noindex` anything on this host** beyond the auth and private routes
  in the `robots.txt` below. It is the host being promoted.

### The four lines missing from `index.html`

Cheap, no architecture change, and they bound everything downstream.

- **`<html lang="es-MX">`**, not `en`. Every UI string is Spanish (`CLAUDE.md`,
  *Language*); `en` tells search engines and screen readers to read Spanish copy
  as English.
- **`<meta name="description">`** — the ~155-character sentence shown under the
  title in results. Without one the engine invents a snippet from whatever text
  it finds, which in a client-rendered app is often nothing.
- **`<link rel="canonical">`** — "this is the real address of this page", which
  stops `?utm_…` and `?product=…` variants being counted as separate duplicate
  pages.
- **Open Graph + Twitter tags** (`og:title`, `og:description`, `og:image`,
  `og:url`, `twitter:card`) — what WhatsApp, Instagram and Facebook read to draw
  the preview card on a pasted link. **Not Google tags.** This is channel 1.

`og:image` needs a real 1200×630 file. There is no `public/` directory today;
create one — and remember the shell's tags are the **floor**, giving every route
the same card. Per-route cards are §6.

### `public/robots.txt`

A plain-text file saying which paths crawlers may read. Today the request
returns HTML, which is a malformed answer to the first question every crawler
asks.

```
User-agent: *
Disallow: /login
Disallow: /signup
Disallow: /recover
Disallow: /reset
Disallow: /verify
Disallow: /profile
Disallow: /transactions
Disallow: /requests
Disallow: /chats
Disallow: /map
Allow: /

Sitemap: https://app.alkachof.mx/sitemap.xml
```

`/catalog` (the owner's editor) resolves from the auth token and bounces a
stranger to `/login`, so it has nothing to index. **Do not `Disallow: /catalog`**
— the prefix would take the public `/catalog/:catalogId` view with it.

`/version.json` proves a static file escapes the SPA rewrite: Vercel checks the
filesystem before applying `rewrites`. Re-verify after adding the files anyway.

## 5. P0 — the app has to serve HTML, or none of this works

Now that `app.alkachof.mx` is the ranking target, client-side rendering stops
being a tradeoff and becomes the blocker.

The app is a Vite SPA: the served HTML is a shell with an empty `<div
id="root">`, and all content arrives after JavaScript runs. Three different
classes of visitor read that:

| Visitor | Runs JS? | Sees today |
|---|---|---|
| A person | yes | the app, correctly |
| Googlebot | yes, eventually | a login redirect at `/`; slow, deprioritised indexing elsewhere |
| `ClaudeBot`, `GPTBot`, `PerplexityBot`, `OAI-SearchBot` | **no** | an empty `div` |
| WhatsApp, Instagram, Facebook preview crawlers | **no** | an empty `div` |

**The complaint cannot be fixed client-side.** The assistant that reported
"Coming Soon" would, pointed at `app.alkachof.mx`, read an empty page — which is
exactly the second answer received ("únicamente el título Alkachof"). That was
the shell. Adding `<meta>` tags to the shell (§4) fixes the *card*; it does not
put a single sentence of product copy in front of a crawler that does not run
JS.

So the public routes need real HTML at the URL. Target shape, in effort order:

1. **Prerender the static public routes at build time** — `/` (the guest
   landing) and `/about`. A post-build step renders each to its own
   `index.html`, which Vercel then serves as a static file ahead of the rewrite.
   This covers both crawler classes and all of channel 2, and it is the item to
   do first because the landing page is where brand queries land.
2. **Inject metadata per catalog at the edge** for `/catalog/:catalogId` and
   `/join` — §6, because those are per-seller and cannot be baked at build time.

Rules:

- **A framework migration is not on the table.** The architecture in
  `CLAUDE.md` is settled and the app is phone-only client rendering. Rewriting
  it onto Next.js, or onto React Router's framework mode, to recover a `<meta>`
  tag and a paragraph of HTML is the most expensive available route to both.
- **Prerendered content must match what the app renders.** Serving crawlers copy
  that users do not get is cloaking, and search engines penalise it. Same
  substance, rendered twice — which is why §4 reuses `AboutPage` rather than
  hand-writing a parallel landing page that will drift.
- **If the prerender step is deferred**, the stopgap is static marketing HTML
  placed *inside* `<div id="root">` in `index.html`: non-JS crawlers read it,
  and `createRoot().render()` replaces it for real users. It is a legitimate
  pattern under the same no-cloaking constraint, and it is strictly worse than
  prerendering because it only ever covers `/`. Treat it as a stopgap, not the
  plan.

## 6. P1 — a real preview per shared link

`catalogShareUrl()` mints `/join?catalogId=…` and sellers paste it into
WhatsApp. Those crawlers do not run JavaScript (§5), so **every seller's link,
for every shop, previews identically and generically, or not at all.**

Highest return of anything in this document once §4 and §5 land, because it
converts traffic that already exists: it turns a grey link into the seller's own
photo and shop name at the moment a buyer decides whether to tap.

A Vercel serverless/edge function on `/join` and `/catalog/:catalogId` fetches
the catalog from `api.alkachof.mx`, substitutes `og:title`, `og:description`,
`og:image` and `canonical` into the shell, and serves it. The React app below is
untouched.

- **`og:image` must be the catalog's own image**, as the absolute
  `api.alkachof.mx/img/<key>` URL the app already uses. A crawler cannot resolve
  a relative path and will not log in.
- **Never put a third-party CDN url in an `og:image`.** Those links expire, and
  a preview card built on one rots silently.
- **Public, unauthenticated API reads only** (`GET /catalog/:id`). The function
  holds no token and must never be given one.
- **A failed or slow API read falls back to the generic shell.** A link that
  previews plainly still opens; a link that times out does not.

## 7. P1 — being answerable

Assistants answer about an unknown brand from (a) the live page and (b) what
third parties say. Today (a) is a `noindex` parking page or an empty shell, and
(b) is a GitHub repo. "I can't tell what this is, can you give me more context?"
is the correct output from those inputs.

- **Stop blocking the crawlers, deliberately.** The Squarespace `robots.txt` at
  the apex disallows `ClaudeBot`, `GPTBot`, `anthropic-ai`, `CCBot`,
  `Google-Extended`, `PerplexityBot`, `Applebot-Extended`,
  `Meta-ExternalAgent` and more — a platform default nobody chose. For a brand
  nobody has heard of, being quotable **is** distribution; blocking retrieval
  bots pays a training-data posture out of an acquisition budget. The §3
  redirect disposes of that file; make sure nothing like it reappears in
  `app.alkachof.mx/robots.txt`.
- **Publish one declarative paragraph answering "What is Alkachof?"** — Spanish,
  crawlable, in the first 200 words of `/`, without marketing abstraction.
  *"Alkachof es un catálogo digital gratuito para vendedores pequeños en México:
  publicas con las fotos de tu celular y compartes tu tienda por WhatsApp."* A
  model quotes a sentence it can lift; it cannot lift a slogan.
- **Add structured data** — `Organization` (name, logo, url, `sameAs` to the
  social profiles) and `FAQPage` on the FAQ. These are `<script
  type="application/ld+json">` blocks: facts in a form machines need not infer.
- **Third-party corroboration is the real lever.** One self-published page is a
  claim; a LinkedIn company page, an Instagram account, a Product Hunt listing
  and a Crunchbase row make it something several sources agree on. Marketing
  work, not engineering work, and it moves assistant answers more than anything
  in §4.
- Optional and cheap: `/llms.txt`, a plain-text product summary at the domain
  root. An emerging convention, not a standard — add it, do not budget for it.

### The brand name is a search problem, and titles have to absorb it

`alkachof` is one letter from `alcachofa` — artichoke. Engines treat it as a
misspelling and substitute the vegetable, against a deep commercial corpus
(Mercado Libre, Amazon, supplements, recipes). A search for `alkachof.mx` today
returns artichoke listings.

The mitigation is to **never ship the bare brand as a `<title>`**. Every title
and description pairs it with the category:

> `Alkachof — catálogo digital gratis para vender por WhatsApp`

That gives the engine a non-vegetable context for the token, and it is also what
makes the result clickable to someone who has never heard the name.

## 8. P2 — the content engine, and which queries are winnable

Two audiences, two kinds of query, and only one is realistic to start.

**Buyer-side local intent** — "comida casera cerca de mí", "plomero en
[colonia]" — is the dream and is not winnable yet. It needs indexable catalog
pages at volume (§10) plus local authority. Do not start here.

**Seller-side acquisition** is winnable and is the real growth channel —
low-competition Spanish long-tail queries matching the positioning in
`PRODUCT.md` exactly:

- *catálogo digital gratis*
- *cómo vender por WhatsApp sin página web*
- *tienda en línea gratis sin comisiones*
- *catálogo de productos para WhatsApp*
- *cómo vender por Instagram sin tienda*
- *crear catálogo con fotos del celular*
- *alternativa gratis a [store builder]*

One page per query, Spanish, es-MX, each ending in the same action: create your
catalog. Two a month beats twelve in one week — search rewards a site that keeps
publishing. The honest framing ("no fees, no plan to choose, publish in
minutes") is both true and what the query is asking for.

**Where this content lives is a decision.** A blog on the promoted host
(`app.alkachof.mx/guias/…`) keeps every link and signal on the canonical
address, which is the point of §3 — but it also means marketing content inside
an app repo whose golden rule is phone-only, no desktop layouts. Prefer a
`/guias` prefix served by the same prerender step as `/` (§5), with simple
responsive article pages. Revisit if and when `alkachof.mx` becomes a real
company site with its own stack.

## 9. The repo is part of the public footprint

`github.com/chnt-gomez/alkachof-web-v3-min` is public, outranks the product for
the brand name, and is where assistants are getting their (correct) product
description.

- **`CLAUDE.md` publishes seeded test credentials** (`user@admin.com /
  password`, ×3) and the seeded catalog ids — test data against a
  production-adjacent API, in a public, indexed repository. Rotate or remove
  them regardless of what else here gets done.
- **Decide whether the repo should be public.** If yes, make it a funnel:
  `README.md` names no URL at all today, and a link to `app.alkachof.mx` turns
  the brand's top result into a door. If no, make it private and the result
  disappears on its own.

## 10. Open decision — should seller catalogs be indexable?

Not a technical question, and **not one to settle by default.** Needs product
sign-off.

**For:** public catalog pages are the only content that scales — one page per
seller, real photos, real local terms. The only path to buyer-side local search,
and free inventory.

**Against:** `PRODUCT.md` says there is no discovery surface, and sellers
published a link *to send*, not a listing in a public index. Catalog location is
deliberately fuzzed (~110 m grid) precisely so a nano-seller's home address
cannot be enumerated; an indexed catalog page with a map is a different privacy
bargain from the one they agreed to.

**Recommendation:** index, but opt-in or opt-out per seller, surfaced in the
catalog editor in plain Spanish ("aparecer en Google"), with a sitemap covering
only consenting catalogs. Until that toggle exists, leave `/catalog/:catalogId`
crawlable — it is a link the seller already shares publicly — and do not submit
a sitemap of catalogs.

## 11. Measurement

- **Google Search Console on `app.alkachof.mx`** — the property that matters,
  since it is the promoted host (a subdomain is a separate site to Google; add
  `alkachof.mx` too, to confirm the §3 redirect is seen). The only place that
  reports what Google actually indexed, which queries showed the site, and why a
  page was excluded. **Set it up before the changes**, so there is a baseline.
- **Bing Webmaster Tools.** Disproportionately worth it: Bing's index backs
  several assistant search integrations, making it the cheapest input to
  channel 2.
- **Analytics.** The app has none today. Adding it is a separate decision with
  its own privacy posture, not an SEO task.
- One check needing no tooling: re-run the §1 table after each phase. Five
  `curl`s produced every finding in this document.

## 12. Order of work

| # | Item | Status | Why here |
|---|---|---|---|
| 1 | GSC + Bing verified (§11) | **ops** | the baseline has to predate the changes |
| 2 | Public front door at `/`, split by auth (§4) | ✅ `RootRoute` | unblocks everything; a promoted login wall ranks for nothing |
| 3 | `lang`, description, canonical, OG + image, `robots.txt` (§4) | ✅ | bounds every channel |
| 4 | Apex + `www` 301 → app, path preserved (§3) | **ops** | kills "Coming Soon", revives the printed QR codes |
| 5 | Prerender `/` and `/about` (§5) | ✅ 1 → 362 words | the only fix for non-JS crawlers; the complaint's real cause |
| 6 | `Organization` + `FAQPage` schema, AI crawlers unblocked (§7) | ✅ | makes the brand quotable |
| 7 | Per-catalog OG via edge function (§6) | ✅ `api/catalog-preview.ts` | highest return on traffic that already exists |
| 8 | Credentials rotated, repo decision (§9) | **open** | independent of everything above |
| 9 | Spanish seller-education content, 2/month (§8) | **open** | the only durable organic channel |
| 10 | Catalog indexability + consent toggle (§10) | **open** | needs sign-off, not a default |

Items 1–5 are roughly one focused week and address the complaint's root cause.
Everything from 6 down is a programme, not a task.

Order note: **2 before 4.** Redirecting the apex onto a root that bounces to
`/login` would trade a parking page for a login wall.

## 13. What shipped on `ALK-SEO-161026`

Everything in §12 marked ✅. Copy is placeholder pending UX/marketing approval
and carries `TODO(marketing)` / `TODO(UX)` markers; the *facts* in it are
load-bearing (free, no commission, 25 items, products **and** services) — if a
claim changes there it has changed in the product.

The measured result, on the built output:

| | before | after |
|---|---|---|
| readable words in the served HTML | **1** | **362** |
| `<html lang>` | `en` | `es-MX` |
| description / canonical / OG / Twitter | none | present, per route |
| `robots.txt`, `sitemap.xml`, `llms.txt` | returned HTML | real files |
| `/` for a signed-out visitor | redirect to `/login` | the landing page |

New surfaces: `src/lib/seo.ts`, `src/router/RootRoute.tsx`,
`src/sections/about/components/AboutFaq.tsx`, `src/prerender/entry-server.tsx`,
`scripts/prerender.mjs`, `scripts/make-og-image.mjs`, `vite.ssr.config.ts`,
`api/catalog-preview.ts`, `public/`.

**Three things remain outside this repo**, and items 1 and 4 are the ones with
a deadline attached — the printed QR codes stay dead until the redirect lands:

1. Verify Search Console and Bing Webmaster Tools on `app.alkachof.mx`.
2. 301 `alkachof.mx` and `www.alkachof.mx` → `app.alkachof.mx`, preserving path
   and query (Vercel domains + deleting the Cloudflare records pointing at
   Squarespace). **Order matters: ship this after the front door, never before.**
3. Rotate the seeded credentials published in `CLAUDE.md` (§9). They are left in
   place here because they are the documented way to run the app against seed
   data; the fix is rotating them on the API, not deleting the line.
