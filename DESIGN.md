---
name: Alkachof
description: The seller's own hand-painted shop sign — a phone-sized marketplace lettered in enamel on lime-wash.
colors:
  background: "hsl(78 13% 94%)"
  foreground: "hsl(200 24% 9%)"
  card: "hsl(70 22% 98%)"
  card-foreground: "hsl(200 24% 9%)"
  ink: "hsl(200 24% 9%)"
  primary: "hsl(328 92% 42%)"
  primary-deep: "hsl(330 94% 30%)"
  primary-foreground: "hsl(70 36% 97%)"
  secondary: "hsl(76 16% 89%)"
  secondary-foreground: "hsl(200 24% 9%)"
  muted: "hsl(76 13% 91%)"
  muted-foreground: "hsl(90 10% 28%)"
  accent: "hsl(46 92% 86%)"
  accent-foreground: "hsl(28 70% 16%)"
  destructive: "hsl(6 74% 40%)"
  destructive-foreground: "hsl(70 36% 97%)"
  destructive-soft: "hsl(6 72% 93%)"
  product: "hsl(328 92% 42%)"
  product-soft: "hsl(330 74% 93%)"
  product-foreground: "hsl(330 94% 30%)"
  service: "hsl(220 80% 36%)"
  service-soft: "hsl(220 62% 92%)"
  service-foreground: "hsl(220 82% 28%)"
  service-ink: "hsl(215 70% 96%)"
  buy: "hsl(45 100% 52%)"
  buy-soft: "hsl(45 92% 88%)"
  buy-ink: "hsl(28 80% 12%)"
  confirm: "hsl(148 72% 28%)"
  confirm-soft: "hsl(148 46% 89%)"
  confirm-foreground: "hsl(148 74% 22%)"
  confirm-ink: "hsl(145 55% 97%)"
  border: "hsl(200 24% 11%)"
  input: "hsl(200 24% 11%)"
  ring: "hsl(328 92% 42%)"
  wall: "hsl(76 8% 80%)"
typography:
  display:
    fontFamily: "Archivo Black, system-ui, -apple-system, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Archivo Black, system-ui, -apple-system, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 400
    lineHeight: 1.0
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Archivo Black, system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.08
    letterSpacing: "-0.02em"
  numeral:
    fontFamily: "Archivo Black, system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    letterSpacing: "-0.01em"
    fontFeature: "tabular-nums"
  body:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  body-field:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    letterSpacing: "0.025em"
    textTransform: "uppercase"
rounded:
  sm: "0.125rem"
  md: "0.25rem"
  lg: "0.375rem"
  xl: "0.5rem"
  2xl: "0.625rem"
  3xl: "0.75rem"
  full: "9999px"
spacing:
  hair: "4px"
  tight: "8px"
  snug: "12px"
  base: "16px"
  gutter: "20px"
  section: "24px"
  band: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.xl}"
    padding: "8px 20px"
    height: "44px"
    typography: "{typography.body}"
  button-primary-hover:
    backgroundColor: "{colors.primary-deep}"
  button-outline:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: "8px 20px"
    height: "44px"
  button-outline-hover:
    backgroundColor: "{colors.accent}"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    rounded: "{rounded.xl}"
    padding: "8px 20px"
    height: "44px"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.destructive-foreground}"
    rounded: "{rounded.xl}"
    padding: "8px 20px"
    height: "44px"
  button-ghost:
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: "8px 20px"
    height: "44px"
  button-ghost-hover:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-foreground}"
  button-link:
    textColor: "{colors.primary}"
    rounded: "{rounded.xl}"
    padding: "8px 20px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.2xl}"
    padding: "20px"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: "8px 14px"
    height: "44px"
    typography: "{typography.body-field}"
  banner-field-seller:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "0"
    padding: "20px 20px 24px"
  banner-field-chrome:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.background}"
    rounded: "0"
    padding: "20px 20px 20px"
  banner-field-buy:
    backgroundColor: "{colors.buy}"
    textColor: "{colors.ink}"
    rounded: "0"
    padding: "20px 20px 20px"
  app-header:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.background}"
    rounded: "0"
    padding: "10px 16px"
  chip-product:
    backgroundColor: "{colors.product-soft}"
    textColor: "{colors.product-foreground}"
    rounded: "{rounded.md}"
    padding: "2px 8px"
    typography: "{typography.label}"
  chip-service:
    backgroundColor: "{colors.service-soft}"
    textColor: "{colors.service-foreground}"
    rounded: "{rounded.md}"
    padding: "2px 8px"
    typography: "{typography.label}"
  chip-confirm:
    backgroundColor: "{colors.confirm-soft}"
    textColor: "{colors.confirm-foreground}"
    rounded: "{rounded.md}"
    padding: "2px 8px"
    typography: "{typography.label}"
  chip-destructive:
    backgroundColor: "{colors.destructive-soft}"
    textColor: "{colors.destructive}"
    rounded: "{rounded.md}"
    padding: "2px 8px"
    typography: "{typography.label}"
  chip-option:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  chip-option-selected:
    backgroundColor: "{colors.product-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  nav-tab-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.full}"
    height: "32px"
    width: "56px"
  nav-tab-inactive:
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.full}"
    height: "32px"
    width: "56px"
  toast-success:
    backgroundColor: "{colors.confirm}"
    textColor: "{colors.confirm-ink}"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
  toast-error:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.destructive-foreground}"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
  badge-notification:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.full}"
    size: "18px"
  badge-unread:
    backgroundColor: "{colors.buy}"
    textColor: "{colors.buy-ink}"
    rounded: "{rounded.full}"
    size: "18px"
  skeleton:
    backgroundColor: "{colors.muted}"
    rounded: "{rounded.md}"
---

# Design System: Alkachof

## Overview

**Creative North Star: "Rotulación — The Seller's Own Painted Sign"**

Alkachof is *rotulación*: the hand-lettered Mexican shop sign, painted in enamel on a
lime-washed wall. The product is not a platform's chrome wrapped around a seller's goods;
it is the seller's own sign, and the seller's name is the loudest thing on it. Nothing
floats. Everything is lettered onto a surface and nailed to it. The whole system falls out
of one physical claim: **paint does not blur.**

Every value here was chosen against a use scene, not a category habit. A micro-seller
holds a mid-range Android at half brightness, outdoors, in Mexican sun. That forces a
light ground, maximum contrast, and structure drawn in solid ink — delicate hairlines and
low-contrast grays disappear in glare. The ground is *cal*, slaked lime: alkaline, chalky,
and cool enough to read faintly green. It is never ivory. The paint is enamel, and enamel
is saturated: a hue in this world either carries a semantic role at full strength or it is
not on the screen. Where a value looks louder than an interface palette normally runs,
that is the decision.

Structure is entirely ink. Every border and every shadow in the product is the same near-black
cool ink — not a "neutral", but the paint the sign is drawn with. Depth is a hard 2px/4px/6px
offset with zero blur radius. There is no ambient shadow, no blur, no glow, and no opacity ramp
anywhere except a two-step scrim. The app is a single phone column; above 640px it becomes a
28rem painted board hung on a gray wall, bounded by 2px ink keylines and a 10px hard ink offset.

**Key Characteristics:**
- Blurless hard offset shadows (`Npx Npx 0 0` ink) as the only depth model
- 2px ink keylines everywhere; hairlines and alpha'd borders are banned
- Four saturated fields that own whole regions rather than accent a neutral ground
- One display face (Archivo Black), caps, tight tracking, self-hosted, ~20KB
- Motion is a repaint in 90–180ms steps, never a fade
- Phone-only column; no desktop layout exists

## Colors

Enamel on lime-wash: one chalky cool ground, one structural ink, and four saturated paints
that each own a semantic role at full strength.

### Primary
- **Rosa Mexicano** (`hsl(328 92% 42%)`): the signature and the `product` role at once — a
  product *is* the seller's own thing. It carries every primary action, every price, the focus
  ring, `::selection`, the caret, the active nav tab, and the saturated banner on the seller's
  own surfaces (Inicio, Perfil, Catálogo, the public catalog jumbotron). At 92% saturation it
  is enamel, not a tint.
- **Rosa Profunda** (`hsl(330 94% 30%)`): the pressed/hover state of a rosa plaque, and the
  text color for rosa lettering on rosa's own wash (`product-foreground`).
- **Rosa Cal** (`hsl(330 74% 93%)`): the `product-soft` wash behind a PRODUCTO chip and a
  selected option plaque.

### Secondary
- **Añil** (`hsl(220 80% 36%)`): services, and services only. Rosa against añil is
  red-against-blue, which is the pairing that survives glare on a cheap LCD. Its wash
  (`hsl(220 62% 92%)`), its text-on-wash (`hsl(220 82% 28%)`) and its text-on-fill
  (`hsl(215 70% 96%)`) complete the role.
- **Amarillo** (`hsl(45 100% 52%)`): the buy side — the cart drawer's banner field, the cart
  FAB, the unread-message badge. The loudest paint on the wall. Its wash is
  `hsl(45 92% 88%)`; text on a filled amarillo surface is always the deep `buy-ink`
  (`hsl(28 80% 12%)`), never white, which lands near 1.8:1 on it.

### Tertiary
- **Verde Confirmado** (`hsl(148 72% 28%)`): a confirmed or completed state, and nothing else.
  It is deliberately not the primary: a delivered order must never be painted the same color
  as "this is a button". Wash `hsl(148 46% 89%)`, text-on-wash `hsl(148 74% 22%)`,
  text-on-fill `hsl(145 55% 97%)`.
- **Rojo Óxido** (`hsl(6 74% 40%)`): destructive. Kept a true red so it still reads as danger,
  but browner and darker than the signature, so rosa and it no longer collide in a dialog
  footer. Its `destructive-soft` (`hsl(6 72% 93%)`) exists so error panels and out-of-stock
  chips stop being drawn as an alpha'd fill over an alpha'd keyline.

### Neutral
- **Cal** (`hsl(78 13% 94%)`): the lime-washed wall. Every page ground. Chalky, cool, faintly
  green; a shade darker than paper so a plaster board nailed to it can be brighter than its
  surroundings and still read as white.
- **Yeso** (`hsl(70 22% 98%)`): the card/field surface — the plaster board itself.
- **Ink** (`hsl(200 24% 9%)`, keylines at `hsl(200 24% 11%)`): all body text, every border,
  every shadow, the app header, and the page chrome that belongs to no role. Cool, so it sits
  against a cool wall rather than drifting warm with it.
- **Cal Tenue** (`hsl(90 10% 28%)`): the system's only gray-ish text — empty states, field
  labels, inactive tabs, timestamps. It lives in the cal family, not in a neutral blue-gray
  borrowed from no system.
- **Wall** (`hsl(76 8% 80%)`): the >640px surround behind the phone column. This is a literal
  in the `@media (min-width: 640px)` block of `src/index.css`, **not a theme token**, because
  nothing else in the product paints with it.

### Named Rules

**The Four-Slot Rule.** A painted role owns four slots, not one: the **hue**, a **`-soft`**
wash, a **`-foreground`** for text sitting on that wash, and an **`-ink`** for text sitting on
the filled hue. A role missing one of them gets painted with its full-strength hue on its own
wash, and fails contrast. Both live failures this round were exactly this: the PRODUCTO chip
measured 4.36:1 and "Entregado" measured 4.42:1, on the two most-repeated chips in the app.
Never introduce a role without all four.

**The Role-Not-Page Rule.** A saturated field belongs to a *role*, never to a page. Rosa is
the seller's own things (Inicio, Perfil, Catálogo, the public jumbotron). Amarillo owns the
cart drawer. Añil is services and nothing else. Page chrome that belongs to no role is **ink**
(Pedidos, Chats, the app header). A screen painted rosa because it needed a banner is rosa
used as wallpaper, and the signature stops meaning anything.

**The No-Alpha-Keyline Rule.** A keyline is 2px of solid ink. `border-destructive/40`,
`bg-destructive/5` and every other alpha'd edge or fill are a 40%-strength keyline, which this
world does not have. If a surface needs a quiet tint, it takes its role's `-soft` token.

## Typography

**Display Font:** Archivo Black (with `system-ui, -apple-system, sans-serif`) — self-hosted
and bundled, no CDN request, ~20KB.
**Body Font:** the platform stack (`system-ui, -apple-system, sans-serif`).

**Character:** One heavy grotesque, set in caps with tight tracking, doing every job a sign
painter would do by hand — shop names, page titles, prices, counts — over a system stack that
does the reading. The face is heavy enough to hold a hard drop shadow without the shadow eating
the letterform. The type budget is one webfont, on purpose: this app loads on mobile data.

### Hierarchy
- **Display** (Archivo Black, 2.25rem / 36px, line-height 1.02, tracking -0.02em, caps): the
  landing page's one hero line. One per product.
- **Headline** (Archivo Black, 1.875rem / 30px, line-height 1.0, tracking -0.02em, caps): the
  page title inside a painted band — Inicio, Perfil, Pedidos, Chats, the catalog name.
- **Title** (Archivo Black, 1rem–1.5rem, line-height 1.08, tracking -0.02em): card titles,
  dialog titles, section heads. `h1`, `h2` and `.display` pick the face up automatically.
- **Numeral** (Archivo Black, tabular-nums, tracking -0.01em, via `.numeral`): money and counts.
  They are lettered, and they line up in a column. `td`/`th` carry tabular figures globally.
- **Body-field** (system stack, **1rem / 16px**, line-height 1.5): every `<input>`, `<textarea>`
  and `.input`. See The 16px Floor Rule.
- **Body** (system stack, 0.875rem / 14px, line-height 1.5): the default reading size and by far
  the most-used step.
- **Caption** (system stack, 0.75rem / 12px): metadata, helper text, timestamps.
- **Label** (system stack, 0.6875rem / 11px, weight 700, uppercase, `tracking-wide`): the
  bottom of the ramp — type chips (PRODUCTO / SERVICIO), status badges, nav tab labels, payment
  and delivery tags on the banner. **11px is the floor.**

### Named Rules

**The 16px Floor Rule.** Any field a finger can focus is 16px. iOS Safari zooms the viewport on
focus for anything under it, and on a phone-only product that jump happens on every form. This
applies to the `Input` primitive, the `.input` utility class, and every raw `<textarea>` —
the rule was previously enforced in one place and broken in nineteen.

**The Lettering-Is-Signage Rule.** The display face is for things a sign painter would letter:
a shop name, a page title, a price, a count. It is never used for body copy, helper text, or a
paragraph. Two consecutive sentences in Archivo Black are a mistake.

**The 11px Floor Rule.** No text ships below 11px. The scene is a half-brightness LCD outdoors
in sun; 10px uppercase at 700 weight is not readable there. Seven sites currently violate this
(see Don'ts) — they are drift, not a step on this ramp.

## Layout

A single phone column, small-screen-first, with **no desktop layout at all**. `#root` is
`min-height: 100dvh` and full-bleed below 640px.

Above **640px** the app stops widening and becomes an object: `#root` caps at **28rem**,
centers, keeps the cal ground, and gains `border-inline: 2px solid ink` plus
`box-shadow: 10px 0 0 0 ink` — a painted board hung on a gray wall (`hsl(76 8% 80%)`). The
surround is a hard offset like everything else here, never a soft ambient glow. This is the
only breakpoint in the system.

**Spacing rhythm** is a 4px base, used in a narrow band: `4px` between a label and its value,
**`8px` and `12px`** for the great majority of gaps (the two most common steps in the build),
`16px` for grouped blocks, **`20px` as the page gutter and card padding**, `24px` between
sections, `32px` for a band. Painted bands break the gutter deliberately with negative margins
(`-mx-4`/`-mx-5`, `-mt-4`/`-mt-5`) so a field runs full-bleed to the column edge.

Product lists use a **CSS `columns-2` masonry**, not a 2-column grid, so cards of unequal image
height never leave a trailing blank cell. Product images are `object-contain w-full` with no
fixed height — the container grows to the photograph, because the photograph is the seller's
marketing.

The bottom tab bar is fixed, 5 tabs, bounded by a 2px ink top keyline, with
`pb-[env(safe-area-inset-bottom)]`; authenticated `<main>` reserves `pb-24` for it. Full-screen
surfaces (a chat thread) drop the tab bar entirely.

## Elevation & Depth

**There is no blur in this system.** Depth is paint: a hard offset in solid ink with a blur
radius of exactly zero, in one direction (down-right), in one color. An object is not lifted off
the wall by light, it is a board nailed to the wall with its shadow painted beside it.

### Shadow Vocabulary
- **`shadow-sm`** (`2px 2px 0 0 hsl(200 24% 9%)`): the default and the overwhelming majority —
  every button, card, input-on-focus, active nav pill and small plaque.
- **`shadow-md`** (`4px 4px 0 0 hsl(200 24% 9%)`): toasts and raised overlays.
- **`shadow-lg`** (`6px 6px 0 0 hsl(200 24% 9%)`): the rare largest lift.
- **The board surround** (`10px 0 0 0 ink`): horizontal-only, the >640px column.

### Motion
Every animation steps between painted values. `overlay-paint` is 0.1s in `steps(2, end)` — the
only place opacity moves at all, and it moves in two discrete steps. `sheet-pop` (0.16s) slides
a panel up at **full opacity**: an object arriving, not an image resolving. `word-swap` is 0.12s
in `steps(3)`. The loading skeleton (`plaque-wait`, 1.1s `steps(1)`) alternates between `muted`
and `secondary` rather than pulsing opacity. A deep-link arrival repaints a card's keyline and
shadow to rosa and back, twice, in `steps(1)`. Under `prefers-reduced-motion` every one of these
resolves to `animation: none`, the progress fill collapses to 0.01s, and the highlight becomes a
standing 3px rosa outline — nothing is hidden, because nothing was conveyed by opacity.

### Named Rules

**The Zero-Blur Rule.** No `box-shadow` in this product has a blur radius, a spread, or an alpha
color. Four values exist and they are the four above. A soft, ambient, or colored glow is the
category default this world refuses.

**The Press Rule.** The app's one authored interaction: a plaque translates `2px, 2px` into its
own shadow and the shadow collapses to `none`, over 90ms ease-out. It is never a scale, never a
lift, never an opacity change. `.plaque-press` owns it and is gated on `:not(:disabled):active`.

**The Repaint-Not-Fade Rule.** A state change is a repaint — a color field swaps. Fades are
banned, including `animate-pulse`, which was the last one in the product and was the first frame
of every screen.

## Shapes

Painted plaques, not pills. The radius scale is deliberately small and tight — the largest
general radius is **0.625rem (10px)** on a card, and the working default is **0.5rem (8px)** on
buttons and fields. Nothing in the content layer is capsule-shaped; a rounded rectangle with a
heavy keyline reads as a board, and a capsule reads as a chip in someone else's design system.

`rounded-full` survives in exactly three jobs, all of them non-rectangular objects: the active
nav pill, count badges, and avatars.

Every object is bounded by a **2px** border in ink. There is no 1px border and no hairline
anywhere; `*` inherits `border-color: var(--color-border)` so an un-colored border is still ink.
Links carry `text-decoration-thickness: 2px` for the same reason — even an underline in this
world is a painted stroke.

### Named Rules

**The Sign-Band Rule (`.sign-band`).** The sign painter's closing line. A painted field ends in a
*double* rule: the 2px keyline that bounds the paint, and a second 2px ink rule set **12px above
the bottom edge and 12px in from each side**. Both strokes stay 2px — thinning the inner one
would smuggle a hairline into a world that bans them, so the **gap is the only lever**, and at
5px the two strokes read as one thick doubled edge instead of two rules. It is inset, so it never
shifts layout, and it is decorative: click-through and `aria-hidden` by construction. Every
full-bleed painted field gets it (the jumbotron, the catalog header, Inicio, Perfil, the cart
drawer). Without it the product's loudest surface was bounded by exactly the same edge as a list
item.

**The Chosen-Not-Focused Rule (`.plaque-selected`).** Selection repaints the plaque's **own**
keyline and shadow in the signature (`border-color: primary; box-shadow: 2px 2px 0 0 primary`).
It is never a `ring`: a concentric second edge outside the ink keyline reads as a focus state the
keyboard never set. Focus stays the global `outline: 3px solid ring` at `outline-offset: 2px`.

## Components

### Buttons
- **Shape:** softly squared (8px, `rounded-xl`), 2px ink keyline, hard 2px ink offset.
- **Sizes:** default 44px tall / 20px side padding; `sm` 36px / 16px at 12px type; `lg` 48px /
  32px at 16px; `icon` 40×40.
- **Primary:** rosa fill, cal-white lettering; hovers to rosa profunda.
- **Destructive:** rojo óxido fill; hovers by `brightness-95` rather than a second token.
- **Outline / Secondary:** plaster or cal-tinted fill, ink lettering; both hover to the pale
  amarillo `accent` wash.
- **Press:** `.plaque-press` — translate 2px/2px, shadow to none, 90ms. Disabled drops to 50%
  opacity and kills pointer events.
- **Ghost / Link:** deliberately **unpainted** — lettering on the wall, not an object nailed to
  it. Neither carries a keyline or a shadow. Link is rosa, underlined at 2px.
- **Progress button:** a rosa plaque that holds its pressed position while pending and fills
  left-to-right with `bg-current/30` over 1s linear. The fill is the only translucent surface in
  the product, and it is a fill over the button's own color, not a shadow.

### Chips
- **Style:** 4px radius (`rounded-md`), 2px ink keyline, `2px 8px` padding, 11px bold uppercase
  with wide tracking. Always a role's `-soft` wash with that role's `-foreground` lettering —
  never the full hue on its own wash.
- **Type chips:** PRODUCTO on rosa-soft, SERVICIO on añil-soft. **Both types are labelled**, not
  just services: an unlabelled card only reads as "a product" once you already know services are
  the tagged ones.
- **Status chips:** confirm / destructive / buy families, same silhouette.
- **Option chips:** plaster plaque with an ink keyline at rest; `.plaque-selected` when chosen.

### Cards / Containers
- **Corner Style:** 10px (`rounded-2xl`), the largest radius in the system.
- **Background:** plaster (`card`), on the cal ground.
- **Border:** 2px ink, always.
- **Shadow:** `shadow-sm` at rest — see Elevation. Cards do not change elevation on hover.
- **Internal Padding:** 20px on header, content and footer; content and footer drop the top pad.
- **Title:** display face at 1rem, `leading-none`, tight tracking. Description is 14px in
  cal-tenue.

### Inputs / Fields
- **Style:** 8px radius, 2px ink keyline, plaster fill, 44px tall, `8px 14px` padding,
  **16px text** (non-negotiable, see The 16px Floor Rule). Placeholder is cal-tenue.
- **Focus:** the field lifts onto its shadow — flat at rest, `shadow-sm` on focus, 90ms. The
  global 3px rosa outline sits over that for keyboard focus.
- **Disabled:** 50% opacity, `cursor-not-allowed`.
- **`.input`** is the utility form of the same plaque, for fields that are not the `Input`
  component (textareas, selects). It carries the same 16px.

### Navigation
- **App header:** a sticky **ink** band with cal lettering and the brand mark; it belongs to no
  role, so it is ink, not rosa. The notification bell's badge is rosa; the unread-chat badge in
  the tab bar is amarillo (the buy side), both 18px circles with a 2px keyline.
- **Bottom tabs:** fixed, 2px ink top keyline on cal. Inactive tabs are cal-tenue lettering at
  11px with a 20px stroke-2 icon; the **active** tab paints a 56×32 rosa pill with an ink
  keyline and `shadow-sm`, and thickens its icon to stroke-2.5. The label is always visible —
  icon-only tabs are not used.

### Dialogs
Bottom sheets on a phone, centered above 640px. The scrim is `ink/70`, painted on in two discrete
steps. The panel arrives via `sheet-pop` at full opacity, carries a 2px ink keyline, and its
title sits in the display face at 1rem above a 2px ink divider. Dialogs showing enlarged product
imagery cap at `max-h-[90vh]` with `overflow-y-auto` so a tall photograph stays scrollable rather
than cropped.

### Painted Field (signature)
The product's signature component: a full-bleed saturated band that breaks the page gutter with
negative margins, bounded below by a 2px ink keyline, closed by `.sign-band`'s inset second rule,
and lettered in the display face in caps with a hard offset text-shadow. Small plaques (payment
methods, delivery options, an edit control) sit **on** the field as keylined chips in the field's
own `-foreground`. It is the thing the whole world is named after.

### Named Rules

**The Offset-Lettering Rule.** The hard sign-painter `text-shadow` (`3px 3px 0`, zero blur) is
**not universal** — it reads only where the lettering and the shadow differ from each other *and*
from the field:
- **Ink offset under light lettering on rosa or on cal** — the default. Ships on the public
  jumbotron, Inicio, Perfil, the landing hero, the checkout confirmation, 404 and the error
  boundary.
- **On an ink field the offset inverts to a third color — rosa.** Cal-on-cal merges into the
  letterform and ink-on-ink vanishes. Ships on Pedidos and Chats.
- **On amarillo it ships flat, by exception.** The lettering there is itself dark, and no offset
  color clears both it and the field. The cart drawer's band carries no text-shadow, and that is
  the correct answer, not an omission.

Before adding an offset, name the three colors. If any two of them match, there is no offset that
works.

**The Uncropped-Image Rule.** Product photography is the seller's marketing. Never `object-cover`,
never a fixed-height image container. Always `object-contain w-full`, letting the container grow
to the photograph's own aspect ratio.

## Do's and Don'ts

### Do:
- **Do** bound every object with a solid **2px ink keyline** and a **blurless offset shadow**
  (`2px 2px 0 0 ink` by default).
- **Do** give any new painted role all four slots — hue, `-soft`, `-foreground`, `-ink` — before
  it ships on a single surface.
- **Do** choose a saturated field by **role**: rosa for the seller's own things, añil for
  services, amarillo for the buy side, verde for confirmed, **ink for chrome that belongs to no
  role**.
- **Do** close every full-bleed painted field with `.sign-band` (inset 2px ink rule, 12px up and
  12px in).
- **Do** set every focusable field at **16px** and every label at no less than **11px**.
- **Do** express selection with `.plaque-selected` — repaint the object's own keyline and shadow
  in rosa — and leave the 3px rosa outline to keyboard focus alone.
- **Do** step motion (`steps(n)`, 90–180ms) and change state by repainting a color field.
- **Do** letter money and counts with `.numeral` so columns of figures align.
- **Do** keep product images `object-contain w-full` with no fixed height.
- **Do** verify all three colors — lettering, offset, field — before applying the hard
  text-shadow.

### Don't:
- **Don't** introduce any `box-shadow` with a blur radius, a spread, or an alpha color. There are
  four shadows in this system.
- **Don't** use an alpha'd border or an alpha'd tint (`border-x/40`, `bg-x/5`) in place of a
  `-soft` token. A keyline is solid or it is not a keyline.
- **Don't** use a 1px border or a hairline divider anywhere.
- **Don't** paint a page rosa because it needed a banner. Rosa is a role, not wallpaper.
- **Don't** paint services in anything but añil, or a confirmed state in the primary.
- **Don't** ship text below **11px**. Seven sites currently do (`NavShell.tsx:38,148`,
  `AnnounceDialog.tsx:140`, `InstagramPostGrid.tsx:75,80`, `ProductGrid.tsx:157`,
  `MessageBubble.tsx:38`); they predate this system, they are **drift, not a ramp step**, and new
  work must not copy them.
- **Don't** reduce a field below 16px — it zooms the viewport on iOS Safari.
- **Don't** add a `ring` to express selection; it reads as a focus state the keyboard never set.
- **Don't** apply the hard text-shadow on an amarillo field, or in ink on an ink field.
- **Don't** use `animate-pulse`, a cross-fade, or an opacity ramp for a state change.
- **Don't** set body copy, helper text or a paragraph in the display face.
- **Don't** use `object-cover` or a fixed-height container on a product image.
- **Don't** widen past the 28rem column or author a desktop layout; there is one breakpoint.
- **Don't** add a second webfont. The type budget is one face.
