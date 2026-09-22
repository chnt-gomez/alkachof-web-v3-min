# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences, **co-primary** — neither is the afterthought, and a design tie
does not automatically break toward the seller.

- **The seller** — a nano/micro entrepreneur in Latin America (es-MX is the
  reference locale): a cook, a seamstress, a plumber, a jeweller, someone
  selling second-hand goods. They are not a retailer. They have no website, no
  store-builder, no POS, and often no inventory list — what they have is a
  phone with photos on it, and frequently an Instagram account doing the job of
  a shop. They work from that phone, on mobile data, between other jobs.
- **The buyer / visitor** — a neighbor or an existing customer arriving from a
  shared link, an invitation, or a QR. They may never sign up: browsing a
  catalog and filling a cart requires no account, and checkout is the only auth
  gate. Their job is to find what a specific local seller offers, ask about it,
  and arrange a purchase.

Both sides live in one app on one account: any seller is also a buyer, and Home
splits along exactly that seam (*Mis cosas* / *Comprar*).

## Product Purpose

Give a very small seller a real, shareable place on the internet in minutes,
with nothing but the photos already on their phone — and give their customers a
way to browse it, ask, order, and stay subscribed to what changes.

Success is a seller who publishes without being taught how, and a buyer who
completes an order without creating an account until the last step.

## Positioning

**A zero-friction shop, in minutes.** An item may be published *blank* — a photo
and nothing else. A price is optional (items import at 0 and are priced later,
like any other unpriced item). A seller who already runs their shop out of
Instagram imports that feed directly rather than retyping it. There is no
setup wizard, no store template to fill in, no plan to choose, and no fee to
start.

Neighboring products ask a small seller to behave like a retailer first —
catalog structure, SKUs, prices, shipping tables, a payment integration — before
anything is visible. Alkachof inverts that: visible first, structured later, or
never.

## Operating Context

- **The phone is the whole product.** All UI targets phone resolutions; there
  are no desktop layouts. The seller edits their catalog on the same device
  they photographed it with.
- **Mobile data is the network budget.** Every image pick is shrunk on-device
  before upload (~5 MB → ~150 KB); reads the client owns are cached and
  persisted rather than refetched.
- **Distribution is a link the seller sends.** A public catalog URL, an
  invitation landing page, and a QR — shared into WhatsApp, Instagram, or in
  person. There is no discovery marketplace or search-the-town surface today;
  a buyer arrives because a seller pointed them here, or because they
  subscribed.
- **Money and handover happen off-platform.** The catalog *declares* what it
  accepts (cash, card, transfer, other) and how goods move (pickup, personal
  delivery, courier shipping). The app records the transaction and its status;
  it does not process a payment.
- **Conversation is part of the deal.** Public questions on a catalog, private
  1:1 chat, and live notifications carry the back-and-forth that a small sale
  actually needs.

## Capabilities and Constraints

Confirmed and shipped:

- **One catalog per user**, capped at **25 items** (server-enforced). The owner
  edits it at `/catalog`; visitors read it at `/catalog/:catalogId`.
- **Items are products *or* services**, and the two carry distinct identity
  through the whole app — a service is *requested*, a product is *ordered*.
- **Instagram import** reads a *public* profile through a scraper on the API
  side. There is no Instagram SDK, no OAuth, and nothing Instagram-related in
  the browser. A private account cannot be read at all. Enrollment is
  **permanent** and ownership cannot be proven — the seller attests. Each
  successful import holds the next run for 7 days, because every feed read is
  billed.
- **Cart is entirely client-side** (`localStorage`), has no route, and needs no
  account. Only checkout calls the backend, and that is the auth gate.
- **Pedidos** shows both sides of the deal (Compras / Ventas), across product
  orders and service requests, with an active feed and an archive. An order
  belongs to *both* parties: one side clearing their view must never destroy
  the other's record.
- **Subscriptions** are the seller's broadcast channel — a visitor subscribes
  to a catalog and receives notifications when it changes.
- **Live notifications and chat** share one Socket.IO connection; REST is the
  source of truth and the socket is best-effort.
- **Admin announcements (News)** are read-only and pull-only. There is no admin
  composer and no write route, deliberately.

Constraints that bind future work:

- **Every environment runs against a real API**, dev included. There is no mock
  layer and no offline mode.
- **The API owns the shapes the client cannot change** — notification deep-link
  routes, the archive rule for the orders feed, the Instagram cooldown, the
  item cap, the image bounds. The client mirrors; it never re-implements.
- **Stored tokens are readable by JavaScript** by necessity (the client builds
  the `Authorization` header), so cookie storage buys expiry and cross-tab
  signalling, not XSS protection.

Undecided / not established:

- Monetization. Nothing in the product charges anyone today.
- Discovery beyond a shared link — no browse-nearby or search surface has
  shipped, though geolocation is captured on the catalog.

## Brand Commitments

- **The name "Alkachof" is permanent.**
- **All end-user text is Spanish**, formatted `es-MX` (currency included).
  Everything developer-facing — identifiers, comments, filenames, tests, logs —
  stays English.
- **The visual world is decided; the palette has been re-cut once inside it.**
  The world is *rotulación*, Mexican hand-painted shop signage, and it is
  settled: enamel on lime-wash, 2px ink keylines, zero-blur offset shadows,
  heavy grotesque caps for lettering. The **signature is rosa mexicano**, with
  añil for services, amarillo for the buy side, verde for confirmed, and ink
  for structure. `DESIGN.md` owns the values; `src/index.css` is the single
  place they live.

  The first cut of this world shipped a signal red on a warm cream ground and
  was replaced, because that pairing is the most-shipped palette in generated
  interfaces — the structure read as rotulación while the colour read as the
  category default — and because it sat ~30° from `destructive`, so the primary
  action and the destructive one were nearly the same paint. Record that as the
  standing test for any future revision: **a palette here has to be legible in
  sun on a cheap panel, keep its roles mutually distinguishable, and not be the
  colour scheme anything else would have picked by default.**

  What is durable regardless of revision is the colour **architecture**: one
  signature colour for the seller's own things, one separating services from
  products, one for the buy side, one for confirmed states, and ink for
  structure — and every role owning the same four slots (the hue, a `-soft`
  wash, a `-foreground` for text on that wash, and an `-ink` for text on the
  filled hue). A role missing one of those slots is how both of this round's
  contrast failures happened.

  **A saturated field belongs to a role, not to a page.** Page chrome that
  belongs to no role is ink; rosa is the seller's own things, not the app's
  wallpaper.
- **The sprout mark and the name are kept**; the mark was re-materialised, not
  redesigned. The bottom-tab navigation shape is preserved by decision.

## Evidence on Hand

- **A running backend** at `VITE_API_BASE_URL` with seeded fixtures: public
  catalogs `6a0365fdf74fdcb617a8a5b6`, `6a0365fdf74fdcb617a8a5c3`,
  `6a0365fdf74fdcb617a8a5d0`; users `user@admin.com` / `user2@admin.com` /
  `user3@admin.com`, password `password`.
- **A shipped, coherent interface** across 14 sections in `src/sections/`, with
  theme tokens in `src/index.css` and primitives in `src/components/ui/`.
- **Written contracts** for every integration boundary in the repo root
  (`followup.*.md`) and design records for shipped features (`blueprint.*.md`).
  `CLAUDE.md` is the operative architecture note.
- **The 2026 roadmap** (`epic.AlkachofRoadmap2026.md`) carries the product's own
  definitions of catalog, product, transaction and subscription.

Absences future work must not paper over:

- **No real seller photography, logos, or shop imagery** ships in this repo —
  there is no `public/` asset directory. Product images come from live sellers
  at runtime.
- **No testimonials, customer names, press, seller counts, GMV, or any usage
  metric exist.** Do not write one into a surface.
- **The About page's word list and hero copy are placeholder**, marked
  `TODO(content)` / `TODO(UX)` in `AboutPage.tsx`. The final list comes from the
  user.
- **No pricing, plan, or fee has been decided.** Do not imply one.

## Product Principles

1. **Publishing must never be blocked by structure.** A photo alone is a valid
   item. Price, description, type and the rest are refinements the seller may
   add later — or not.
2. **Both sides of the deal are first-class.** Every record has an owner and a
   counterparty. Nothing one party does to their own view may damage the
   other's.
3. **The server owns the rules; the client owns the courtesy.** Limits,
   archiving, cooldowns and gates are enforced upstream. The client's job is to
   tell the user *before* they spend the effort — never to re-derive the rule.
4. **Spend the user's bandwidth like it is theirs.** Shrink before upload,
   cache what only this client changes, and never pay for a read twice —
   especially one that is metered.
5. **The seller's images are the marketing.** Never crop them, never fix their
   height, never let a layout decide their aspect ratio.

## Accessibility & Inclusion

No formal standard has been set by the user. Two product-specific needs are
already established in the codebase and must be preserved:

- **Contrast on brand-colored surfaces is deliberate.** The service purple and
  the buy orange are light; filled surfaces in those colors carry a dedicated
  deep-ink foreground token (`--color-service-ink`, `--color-buy-ink`) that
  clears ~5:1, because white on them lands near 2.3:1.
- **Low-end Android phones are the target device.** Slow decodes are surfaced as
  a visible phase ("Optimizando imagen para internet…") rather than left to look
  like a freeze.
