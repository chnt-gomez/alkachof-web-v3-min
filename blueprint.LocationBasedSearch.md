# Blueprint — Location-based catalog search (`/map`)

**Status:** implemented. This is the design record; `CLAUDE.md` holds the operative rules.
**Source:** `feature.LocationBasedSearch.md`.
**Scope:** UI only. **No new endpoint, no new action, no new cache key.** The backend is not
ready, so this story ships the screen and the guards that will bound its first request — and
nothing that calls the network.

---

## 1. What it is

A discovery surface for the buy side. Today the **Comprar** tab of Home shows one thing: the
catalogs the user already subscribed to. This adds a doorway above that list — a card with a map
icon — into a full-screen map centred on the user's own position.

The map pans, it zooms (within a floor), it has a button that brings the viewport back to the user,
and it draws the catalogs around them from `GET /location/lookup` (§7). The search bar is present
and still inert: that endpoint has no `?q=` (§6).

The screen's own rule is that a lookup covers a *circle*, not a viewport — one call returns
everything within 7 km of the point it was made at, and panning inside that circle costs nothing.

---

## 2. The entry point — a card on Comprar

`ComprarPanel` grows a second section, **above** `Catálogos guardados`:

```
ComprarPanel
├─ <MapSearchCard />            # new — static, no data, no loading state
└─ Catálogos guardados          # unchanged
```

It renders unconditionally and immediately. It is **not** gated on `savedCatalogs.status`: a user
with zero subscriptions is exactly the user who needs this card, and making it wait behind the
list's spinner would hide it from them for the length of a mobile-data round trip.

Visually it follows `MyCatalogCard`'s shape — a full-width `<Link>` card, `rounded-2xl border-2
border-ink bg-card p-4`, icon tile on the left, title + description stacked, `ChevronRight` on the
right — with two differences:

- The icon tile is `bg-buy text-buy-ink` (the buy signature colour, as `homeTabs.ts` assigns to
  this half of Home) holding lucide's **`Map`** icon, so the card reads as belonging to Comprar and
  not to the seller side.
- No count line, no empty-state block. It has no data to summarise.

Lives in `src/sections/home/components/MapSearchCard.tsx`, not in the new section — same
arrangement as `NotificationList`, which is Home's presentational row over another section's data.
Home owns the layout of its own panel; the only coupling to the new section is the `to="/map"`
string.

---

## 3. The route

```
/map  →  MapSearchPage      protected, OUTSIDE NavShell
```

Registered beside the chat thread, in the `ProtectedRoute` block that sits outside `NavShell`:

```tsx
<Route element={<ProtectedRoute />}>
  <Route path="/map" element={<MapSearchPage />} />
  <Route path="/chats/new" element={<ChatThreadPage />} />
  <Route path="/chats/:chatId" element={<ChatThreadPage />} />
</Route>
```

**Protected**, because its only entry point is a protected page and the eventual query is a
personalised one. A public map for guests is a separate decision (§10).

**Outside `NavShell`** for the same reason `ChatThreadPage` is: the map owns the viewport. Inside
the shell it would inherit `pb-24`, so the bottom 96px of the map — the part under the user's thumb,
where the recenter button goes — would be covered by tabs, and a `fixed` bottom bar would sit on top
of Leaflet's own attribution control. The page carries its own back button instead, exactly as the
chat thread does.

`/map` over `/search` or `/explore`: the screen *is* the map, and the one-word path matches
`/catalog`, `/profile`, `/transactions`.

---

## 4. Files

```
src/sections/mapSearch/
├── MapSearchPage.tsx                 # the only file the router imports; holds MapNotice
├── mapView.ts                        # the zoom bounds and the arithmetic behind them, §5.2
├── plotShops.ts                      # de-overlaps markers that share a point, §7.4
├── actions/
│   └── lookupNearbyCatalogs.ts       # GET /location/lookup, §7
├── components/
│   ├── SearchMap.tsx                 # MapContainer + TileLayer + pins + FlyToTarget + ViewportWatcher
│   ├── MapSearchBar.tsx              # the (inert) field, see §6
│   └── RecenterButton.tsx            # the "back to me" control
├── hooks/
│   ├── useMapSearchLocation.ts       # device position + phase, see §5.4
│   └── useNearbyCatalogs.ts          # the circle gate: P, the distance rule, the throttle, §7.1
└── __tests__/
    ├── MapSearchPage.test.tsx
    ├── lookupNearbyCatalogs.test.ts
    └── plotShops.test.ts

src/sections/home/components/MapSearchCard.tsx   # §2
src/lib/geolocation.ts                           # extracted, §5.1
src/lib/mapIcons.ts                              # extracted, §5.1
src/lib/lastLocation.ts                          # the remembered-position cookie, §5.5
src/lib/__tests__/geolocation.test.ts
src/lib/__tests__/lastLocation.test.ts
```

The zoom constants live in `mapView.ts` rather than in `SearchMap.tsx` so the component file
only exports components (`react-refresh/only-export-components`) — the same reason `homeTabs.ts`
exists. `LocationNotice` stays unexported inside `MapSearchPage.tsx`: it is that page's four
states and has no second caller.

Changed: `src/router/AppRouter.tsx` (one route + import), `ComprarPanel.tsx` (one element),
`LocationMapPicker.tsx` (adopts the two extracted modules), `HomePage.test.tsx` (one case), and
`src/test/setup.ts` (clears the remembered position globally, for the reason it already clears the
tokens: a hint leaked into the next test in the file makes it pass for the wrong reason).

**Not changed:** `src/lib/queryKeys.ts`, `queryClient.ts`, `queryPersist.tsx`. Nothing on this
screen is cached — see §5.5.

### 4.1 Dependencies

**None added.** `leaflet@1.9` and `react-leaflet@5` are already dependencies, already used by
`LocationMapPicker`, and already in the bundle. OpenStreetMap raster tiles need no key and no
account.

---

## 5. The map

### 5.1 Two pieces get extracted first, not copied

`LocationMapPicker` already solved two problems this screen has again. Copying either one means the
next Vite or Leaflet upgrade breaks two call sites, and only one of them carries the comment saying
why the code is shaped that way.

| Extracted to | What moves | Why it cannot be duplicated |
|---|---|---|
| `src/lib/mapIcons.ts` | the `L.divIcon` factory and the `className: ''` workaround | Leaflet's default marker icon relies on bundled PNGs that don't resolve under Vite, so the marker renders *invisible* — a failure with no error anywhere. The explanation must have one home. |
| `src/lib/geolocation.ts` | `getCurrentPosition` promisified, its options, and the two Spanish failure strings | Two screens asking the same permission must fail with the same sentence, and the `unsupported` vs `denied` split is the part that gets forgotten. |

`geolocation.ts` is a pure promise wrapper — no React, no state:

```ts
export type Coords = { lat: number; lng: number }
export type GeolocationFailure = 'unsupported' | 'denied'
export type DeviceLocation =
  | { ok: true; coords: Coords }
  | { ok: false; reason: GeolocationFailure }

/** Never rejects — both outcomes are ordinary. */
export function getDeviceLocation(): Promise<DeviceLocation>
export function geolocationMessage(reason: GeolocationFailure): string
```

It resolves a result union rather than rejecting: both outcomes are ordinary, and a caller that
has to tell `unsupported` from `denied` inside a `catch` ends up guessing which one it got. Same
instinct as `resizeImage`, which never throws.

`Coords` moves here and `LocationMapPicker` re-exports it for its existing importers, so no consumer
of the picker changes. `DEFAULT_CENTER` (Ciudad de México, `19.4326 / -99.1332`) moves here too —
both screens need the same fallback, and it is the same fallback for the same reason.

Doing this first keeps the new section free of map plumbing: it owns a map *screen*, not a
Leaflet integration.

### 5.2 The zoom floor is the abuse guard

The acceptance criterion asks that zoom-out be bounded "to prevent abusive api calls". The lever is
Leaflet's `minZoom` — the **most zoomed-out** level the map will go to — because the eventual query
is `(centre, radius)` and the radius is read off the viewport. A floor on zoom is a ceiling on
radius, enforced by the map itself rather than by a check someone has to remember to write.

```ts
export const INITIAL_ZOOM = 15   // ~1.8 km across a phone screen — a few blocks
export const MIN_ZOOM = 12       // the floor: ~14 km across, ~25 km tall
export const MAX_ZOOM = 18       // close enough to read a street; OSM serves 19
```

At latitude 19.4° on a 390 px-wide phone:

| Zoom | Width on screen | What it reads as |
|---|---|---|
| 11 | ~28 km | the whole metro area — **refused** |
| **12** | ~14 km | a city's worth of districts — **the floor** |
| 15 | ~1.8 km | a few blocks — **the opening view** |
| 18 | ~0.2 km | a block |

So the largest area one request can ever ask about is a ~15 km radius. That number is the one the
API should cap on its side as well (§7) — the client's clamp is a courtesy, not a control, the same
way a client-side check is only ever a courtesy in front of the API's 429.

The floor also protects the **tile** budget, which is the bill this screen already has: OSM's public
tile servers forbid heavy use, and a map opened at z=5 fetches tiles for a continent. `minZoom`
bounds that without any further work.

**There is no pan leash** (`maxBounds`) and none should be added. Panning to the next colonia is the
gesture this screen exists for, and geography is the wrong axis to bound — panning does not make a
single query larger, it makes queries *more frequent*, and frequency is bounded by rate, not by a
fence (§7).

`scrollWheelZoom` stays on (harmless on a phone, useful in the desktop dev loop); `zoomControl` is
left at Leaflet's default so the map is usable without a pinch in that same loop.

### 5.3 The recenter button

A floating circular control over the bottom-right of the map, `aria-label="Volver a mi ubicación"`,
lucide `LocateFixed`, `h-12 w-12` (a thumb target), `bg-card border-2 border-ink`, positioned above
Leaflet's attribution strip and inside `env(safe-area-inset-bottom)`.

It is **usable in all three states**, which is the part worth stating:

- position known → `map.flyTo(coords, INITIAL_ZOOM)`. No network, no permission prompt.
- position never obtained (denied, or dismissed) → asks again. Re-prompting is the only way back
  for a user who tapped "block" by reflex, and iOS will re-prompt after the user resets the
  per-site permission.
- request in flight → `disabled`, with a spinning icon.

It never hides. A control that disappears when geolocation fails leaves the user with no way to
retry and no explanation.

Implemented the way `LocationMapPicker` already does it: the button lives **outside** `MapContainer`
(so Leaflet's event handling never swallows the tap) and communicates through a `flyTo: { coords,
nonce }` state that a `MapController` child reads inside the map. The nonce is load-bearing — a user
who pans away and taps recenter twice must fly twice, and the coordinates are identical both times.

### 5.4 The four states of the user's position

`useMapSearchLocation()` owns one phase and nothing else:

```
locating → located  (coords in hand)
         → denied   (permission refused, or the request timed out)
         → unsupported (no navigator.geolocation)
```

It asks **once on mount**, with `getCurrentPosition` — never `watchPosition`. A watch drains
battery to move a marker the user did not ask to move, and the acceptance criterion asks for a
button precisely so the app does not track anyone continuously.

The map renders in every state. It opens on the position remembered from last time at
`INITIAL_ZOOM` (§5.5) — or, with nothing remembered, on `DEFAULT_CENTER` pulled right out to
`MIN_ZOOM`, because opening tight on a city the user may be nowhere near is a confident guess and
the overview is the honest one. Either way it flies to the real coordinates at `INITIAL_ZOOM` when
they arrive. **Never a blank screen and never a full-screen
spinner**: an empty map someone can pan is more useful than a spinner, and on a cold mobile GPS fix
the wait is seconds.

Failure shows a dismissible notice over the top of the map — not a dialog, not a page-level error:

| State | Notice | Action in the notice |
|---|---|---|
| `locating` | `Obteniendo tu ubicación…` | — |
| `denied` | `No pudimos obtener tu ubicación. Revisa los permisos e inténtalo de nuevo.` | `Reintentar` |
| `unsupported` | `Tu dispositivo no permite obtener la ubicación.` | none — retrying changes nothing |
| `located` | nothing | — |

`unsupported` is terminal with no retry: a button that
cannot change its own outcome is worse than no button.

Both strings are the ones `LocationMapPicker` ships today, which is the point of extracting
`geolocationMessage` (§5.1).

**A known position renders as a "me" dot, not as a pin:** a filled dot ringed in white, in
`--color-service` (blue), because blue-dot-is-me is the convention every maps app has taught. The
catalog pins that arrive later are `--color-primary` (pink) — two different colours so that the day
the map has 20 markers on it, the user's own position is still findable. Reserving that distinction
now costs nothing; discovering it later means re-skinning both layers.

**Testing on a phone needs https.** `navigator.geolocation` is a secure-context API, so the dev
server reached over a LAN IP (`http://192.168.x.x:5173`) returns a permission error that looks
exactly like a user denial. `localhost` is exempt. Worth knowing before half an hour is spent
debugging a working screen.

### 5.5 Nothing here is cached, and the last fix is remembered in a cookie

The device's coordinates live in component state for the life of the screen. They are:

- **not** a `queryKeys` entry — that file is the closed list of cached reads, and a GPS fix is
  neither a read of the API nor something a mutation can write back;
- **not** in the persisted query blob — `PERSISTED_KEYS` is an allowlist of *API payloads*, and
  this is not one;
- **not** sent anywhere. No action exists to send it to (§7), and until one does, the coordinates
  never leave the device.

One thing does outlive the screen: **the last valid fix, in a cookie** (`alk.lastLoc`, owned by
`src/lib/lastLocation.ts`). Without it every cold start opens on Ciudad de México and then flies
across the country once the fix lands — correct, and visibly wrong for the second it takes.

It is a **hint for the first frame, not a location**, and that distinction is what keeps it honest:

- **Only a real device fix is written** — never `DEFAULT_CENTER`, and never a viewport the user
  panned to. Someone browsing another city must not have the next cold start open somewhere they
  have never been.
- **Rounded to 3 decimals (~110 m).** Not a rounding convenience: a cookie rides along on every
  same-origin request, so whatever is in it is also written into the web server's access log on
  every page load. At the opening zoom the viewport is ~1.8 km across, so 110 m is invisible on
  screen — and it is the difference between a hint and a movement trail in nginx's logs. Precision
  bounds the privacy cost; the 30-day `Max-Age` bounds the duration.
- **Validated on read, not just parsed.** A truncated or hand-edited cookie reads as "no hint",
  because `map.flyTo([NaN, NaN])` throws inside Leaflet and would take the whole screen down over
  a cosmetic optimisation.
- **`saveLastLocation` never throws.** Unlike `setTokens`, where a refused cookie is a login that
  silently did not happen, a hint that cannot be stored costs one animation on the next visit.
- **It seeds `center`, never `coords`**, so it never draws the "you are here" dot (§5.4). The dot
  asserts a fix; the hint is only where the map is looking.

`localStorage` would avoid the access-log question entirely, and was not chosen: cookies are what
this app already has a reviewed primitive for (`cookies.ts`), they carry a browser-enforced expiry
that a `localStorage` key does not, and they survive Safari private mode — the same reasons the
tokens are cookies. The coarse precision is what pays for the difference.

---

## 6. The search bar

It is **present and inert**, and it says so.

The field renders as a real `Input` in a sticky header over the map, `disabled`, with a one-line
caption below it. The alternative — an enabled field that accepts text and does nothing on Enter —
is the shape that produces bug reports, because the user cannot tell a missing feature from a broken
one. A visibly disabled control with a sentence next to it is legible.

| Element | Copy |
|---|---|
| Placeholder | `Buscar catálogos cerca de ti` |
| Caption | `La búsqueda por nombre estará disponible muy pronto.` |

The component takes `value` / `onChange` / `disabled` props from the page even though the page passes
a constant today, so wiring it to a real query is a change inside `MapSearchPage` only. The caption
is one `{!enabled && …}` away from disappearing.

**Do not word it as a search over everything.** `GET /location/lookup` has **no `?q=`** — text
search is a different index and a different feature on the API side, so promising a global name
search would promise an endpoint that does not exist.

---

## 7. The shops on the map

`GET /location/lookup?lat&lng` — **public, no `Authorization`**. Contract:
`followup.LocationSearchApi.md`. `lookupNearbyCatalogs` is the only caller.

### 7.1 One lookup per circle, not per drag

A call returns every located catalog within `radiusMeters` of the point it was made at — call that
point **`P`**. `useNearbyCatalogs` holds `P`, the radius the **server echoed**, and the results.
While the map stays inside that circle the markers are already in memory and panning is free. When
the centre leaves it, that is the first moment the screen could be showing an empty edge, so a new
circle is fetched at the new centre.

```
open map ──► fix ──► lookup at P ──► hold the circle
                                      │
pan inside the circle ──────────────► redraw from memory      (no request)
pan past P ─────────────────────────► lookup at P'            (≥10 s since the last)
```

Everything funnels through one `consider(point)`: the first fix, every settled viewport, and a
re-locate. The distance rule and the throttle are therefore applied in exactly one place.

- **`REFETCH_AT_FRACTION` is the rule, and it is `1`** — refetch exactly when the centre leaves the
  loaded circle. **The trade-off to know:** at that moment the far half of the viewport is already
  outside the loaded area, so a user panning steadily sees a thinning edge for the second the
  request takes. The API's handover suggests 0.6–0.7, which refetches earlier and keeps a loaded
  margin around the viewport at the cost of more calls. It is one constant if that trade is re-made.
- **Measure against `radiusMeters` from the response**, never a local copy of 7000: the server
  clamps, and that field is what actually applied.
- **Send `lat`/`lng` and nothing else.** The defaults *are* the cold-call contract (7 km, 200
  results), so hardcoding `radius=7000` here would mean a server-side change to the radius needs a
  client release.
- **Zooming out is not a bigger radius.** The API accepts up to 50 km, but a wider circle is a
  bigger, slower response and `distanceMeters` stays rounded either way. Stay on the default and
  let the user pan.
- **The viewport trigger is `moveend`**, which fires once after a pan or zoom *settles* rather than
  per frame — which is what makes it safe to hang a network decision off it.

### 7.2 The throttle, and the two refusals

- **The client keeps its own 10 s floor** (`MIN_CALL_INTERVAL_MS`). The server's budget is 6 per
  60 s per IP and is deliberately a different shape: Mexican carriers run CGNAT, so many real users
  share one address and a fast drag can legitimately cross two circles inside ten seconds. The 10 s
  rule governs normal use; the server budget is there so a bug cannot bypass it.
- **A throttled lookup is deferred, not dropped.** The map is already outside the circle it is
  drawing from and *nothing else will ask again until the user moves*, so dropping it would leave
  the screen stale until they happened to pan once more. The timer re-checks the distance when it
  fires — and a newer viewport back **inside** the circle cancels the deferred point, so panning
  out and straight back in does not pay for a lookup of where the user briefly was.
- **Coordinates are validated before they are sent.** A **400 counts against the rate budget**, so
  six malformed calls would lock this client out for a minute.
- **A 429 means "keep showing what you have"** — never an error state. The design is that a 7 km
  circle is already in hand, so the map goes *"· sin actualizar"*, `P` is left where it was, and the
  next pan past it asks again. `availableAt` sets the floor (60 s if the body omits it); never retry
  tighter than the header says.
- **A 404 is terminal.** Proximity search is off on that deployment (`LOCATION_SEARCH_ENABLED`,
  §8 of the handover). Say it once, offer no retry, and never ask again — not even on a pan.

### 7.3 The three numbers that disagree

- **`results.length` is the number to display.**
- **`total` is read and thrown away.** It counts rows *before* the active-seller filter, so it
  includes shops deliberately withheld from `results` (banned, inactive, never verified a phone).
  Rendering it would overstate the map.
- **`truncated` is the only completeness signal**, and it cannot be derived from the other two — one
  is counted after the filter and the other before it. It shows as *"Más de N"*; real `skip` paging
  is deferred (§11).

An **empty circle is a valid answer**, not a failure: *"No encontramos catálogos cerca de aquí."*

### 7.4 The coordinates are approximate, and the UI must not pretend otherwise

Results are snapped to a ~110 m grid and `distanceMeters` rounded to 100 m (`0` means "under
50 m"), so that one cold call cannot enumerate every nano-seller's doorstep in a neighbourhood.
Three consequences:

- **Never present a result as an address.** No "ubicado en", no reverse geocoding, and
  deliberately **no "abrir en mi app de mapas"** anywhere on this screen.
  `CatalogLocationDialog` *does* offer that — it reads the catalog's own exact location, which the
  seller chose to publish, and is a different thing.
- **`shopIcon` is a badge, not a teardrop pin**, and nothing auto-zooms to a marker at street
  level. A pointed pin claims a doorstep the data does not know, and the round blue dot stays
  reserved for "you are here".
- **Two shops in one block collide on the same point.** `plotShops` pushes overlapping markers onto
  a small deterministic ring (18 m, well inside the grid, ordered by `catalogId` so a response
  plots identically every render). It never de-duplicates by coordinate — `catalogId` is the
  identity, and two shops on one point are two shops.

### 7.5 The pin is the catalog's image, and a tap opens the catalog

`shopIcon(resolveMediaUrl(shop.image))` draws the seller's own image in a 40px rounded-square
badge; a catalog with no image gets a bag glyph, drawn *behind* the image so a url that 404s
uncovers it rather than leaving a broken-image icon in the pin.

- **`object-fit:contain`, never `cover`.** The golden rule holds at 40px exactly as `CatalogThumb`
  holds it at 44 — the image is the seller's marketing and this does not crop it. It is also why
  the badge is a rounded square: a contained image inside a circle is a thin band across the middle.
- **One icon object per url**, cached in `mapIcons.ts`. `Marker` compares `icon` by identity, so a
  fresh `divIcon` per render would make react-leaflet rebuild every marker's DOM on every state
  change — with up to 200 shops on screen. The cache grows by one small object per distinct catalog
  the user pans past.
- **Leaflet injects `html` through `innerHTML`**, so the url is `encodeURI`'d *and* html-escaped.
  Both passes earn their place: the first takes `"` and `<` out of the attribute, the second stops a
  literal `&quot;` inside a url from being decoded back into a quote by the parser.
- **Known cost:** these are full-size catalog images (the `catalogs` preset is 1600px) rendered at
  40px, so the pins carry `loading="lazy"` and `decoding="async"` and off-screen ones never
  download. A thumbnail variant from the API is the real fix if a dense circle ever gets expensive —
  worth asking for before the map has crowded cities on it.

**A tap navigates straight to `/catalog/:catalogId`.** Client-side, so returning lands on the map
with its circle still in hand. There is deliberately **no intermediate card**: the shop's own page
already carries its image, description and items, so a card on the map would be a second, thinner
copy of it. Leaflet fires `click` on a tap and not on a drag that happens to end over a marker, so
a pin is not a mis-tap hazard while panning.

Because nothing on the map shows text, the pin's `title` is its whole accessible name and carries
the distance — `Pan de Ana, a 1.1 km` — which is the only place `distanceMeters` appears.

### 7.6 Not cached, deliberately

The circle lives in the hook's state and is **not** a `queryKeys` entry. The gate here is
*geographic*, not temporal: TanStack's staleness model has nothing to say about "the map moved
7 km", and the app's `staleTime: Infinity` default is the wrong answer for someone else's rows. It
is **never persisted** either — a stored circle would keep drawing a seller who has since removed
their pin.

### 7.7 The real constraint is on the seller side

Most catalogs have **no coordinates on file**, so the map is mostly empty and that is not a client
bug. The picker shipped — `LocationMapPicker`, driven by `LocationEditDialog` from the catalog
editor's *Ubicación* block — and with it the three-state `lat`/`lng` semantics in §7 of the
handover: absent leaves the pin alone, a pair moves it, two nulls remove it.

Since then a second gate landed: a located shop is returned only with `is_discoverable` set, which
defaults off (`docs.OptInMapDiscoverable.frontend.md`). The dashboard prompt for a catalog that is
unplaced — or placed and not listed — still does not exist and is the obvious next story.

---

## 8. Copy (es-MX, exact)

| Element | Text |
|---|---|
| Card title | `Buscar catálogos` |
| Card description | `Busca catálogos cerca de ti con el mapa` |
| Card link label (`aria-label`) | `Buscar catálogos en el mapa` |
| Page header | `Buscar catálogos` |
| Back button (`aria-label`) | `Volver` |
| Search placeholder | `Buscar catálogos cerca de ti` |
| Search caption | `La búsqueda por nombre estará disponible muy pronto.` |
| Recenter (`aria-label`) | `Volver a mi ubicación` |
| Locating | `Obteniendo tu ubicación…` |
| Denied | `No pudimos obtener tu ubicación. Revisa los permisos e inténtalo de nuevo.` |
| Unsupported | `Tu dispositivo no permite obtener la ubicación.` |
| Retry | `Reintentar` |
| Tile attribution | `© OpenStreetMap` (the link Leaflet renders — never removed) |
| Searching nearby | `Buscando catálogos cerca…` |
| Count | `N catálogos cerca` / `1 catálogo cerca` |
| Count, `truncated` | `Más de N catálogos cerca` |
| Empty circle | `No encontramos catálogos cerca de aquí.` |
| Refresh refused or failed | `· sin actualizar` (appended to the count) |
| Lookup failed, nothing drawn | `No pudimos buscar catálogos cerca de ti.` + `Reintentar` |
| 404, feature off | `La búsqueda de catálogos cercanos no está disponible por ahora.` (no retry) |
| Pin (`title`, the accessible name) | `{alias}, {distancia}` — e.g. `Pan de Ana, a 1.1 km` |
| Nameless catalog | `Catálogo sin nombre` |
| Distance | `a menos de 50 m` / `a 900 m` / `a 1.1 km` / `a 12 km` (`formatDistance`) |

Three deliberate deviations from the feature doc's strings, all of them typo or house-style fixes:

- **`cerda` → `cerca`.** A typo in the acceptance criteria.
- **`catalogos` → `catálogos`.** Accent required; every other screen spells it with one.
- **`Buscar Catálogos` → `Buscar catálogos`.** Title case in the doc, but every heading in the app
  is sentence case (`Catálogos guardados`, `Mis cosas`, `Mi catálogo`). Two capitalisations of the
  same phrase on two screens is a product bug, not a variant. **Flagging this one for a veto** — it
  is the only deviation that is taste rather than correctness.

---

## 9. Tests

Page-level, per the repo strategy. Leaflet needs a sized DOM that jsdom does not provide, so
`react-leaflet` is mocked — the same mock `LocationMapPicker.test.tsx` already uses, extended to
**capture `MapContainer`'s props** so the zoom clamp is assertable:

```tsx
const mapProps: Record<string, unknown>[] = []
const flyTo = vi.fn()

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children, ...rest }: { children?: ReactNode }) => {
    mapProps.push(rest)
    return <div data-testid="map">{children}</div>
  },
  TileLayer: () => null,
  Marker: () => null,
  useMap: () => ({ flyTo }),
  useMapEvents: () => ({ flyTo }),
}))
```

Geolocation is stubbed through `Object.defineProperty(navigator, 'geolocation', …)`, exactly as the
existing map test does.

### `src/sections/mapSearch/__tests__/MapSearchPage.test.tsx`

| # | Case | Assert |
|---|---|---|
| 1 | Mount, geolocation succeeds | `getCurrentPosition` called **once**; map flown to the returned coords at `INITIAL_ZOOM` |
| 2 | Mount, before the fix arrives | the map renders, centred on `DEFAULT_CENTER`; `Obteniendo tu ubicación…` present; **no** full-screen spinner instead of the map |
| 3 | Zoom clamp | captured `MapContainer` props carry `minZoom: 12` and `maxZoom: 18` |
| 4 | Recenter, position known | tapping `Volver a mi ubicación` flies again; `getCurrentPosition` still called once |
| 5 | Recenter, after a denial | tapping it calls `getCurrentPosition` a **second** time |
| 6 | Permission denied | the denied string in a `role="alert"`, a `Reintentar` control, and the map still rendered |
| 7 | No `navigator.geolocation` | the unsupported string; `getCurrentPosition` never called; **no** `Reintentar` |
| 8 | Search bar | the field is present and `disabled`, and the caption renders |
| 9 | A position is remembered | the map opens on it at `INITIAL_ZOOM`, and with nothing remembered on `DEFAULT_CENTER` at `MIN_ZOOM` |
| 10 | A fix arrives | it is readable through `readLastLocation()` on the next visit |
| 11 | Remembered, fix still pending | **no** position dot — the hint is not a fix |
| 12 | Permission refused | nothing is remembered |

`src/lib/__tests__/lastLocation.test.ts` covers the cookie itself: the round trip, the 3-decimal
rounding, a refused write that must not throw, and six malformed values that must each read as "no
hint" (§5.5).

### The lookup (§7)

`MapSearchPage.test.tsx` carries two further groups, over a mocked `lookupNearbyCatalogs` and a
mocked map whose `useMapEvents` handlers a test fires as a pan:

| Case | Assert |
|---|---|
| Looks up at the fix | called once, at the fix's coordinates; the count renders |
| Tapping a pin | lands on the `/catalog/:catalogId` route stub for *that* shop |
| The pin's image | its icon html carries the catalog's image url |
| The pin's name | `Pan de Ana, a 1.1 km` |
| Nameless seller | the pin reads `Catálogo sin nombre` |
| The count | `results.length`, and the API's `total` appears nowhere |
| `truncated` | *"Más de N"* only when the API said so |
| Empty circle | the empty copy, and **no** `role="alert"` |
| **Pan inside the circle** | ~1 km and ~5 km from `P`: still one call |
| **Pan past `P`** | ~14 km: a second call, centred on the new point |
| **Under the throttle** | the far pan does not call; 10 s later it does |
| **Panned back inside** | the deferred lookup is cancelled |
| 429 | markers and count stay, *"sin actualizar"* appears |
| 429 window | still refused 15 s later, allowed after `availableAt` |
| 404 | the unavailable copy, no retry, and a pan asks nothing |
| Outright failure | `role="alert"` and a `Reintentar` |

The pan cases are the ones that earn this feature. Two notes for whoever edits them: a mocked
`useMap()` must return **one stable instance**, as the real one does, or every re-render re-fires
the effects hanging off it; and the throttle cases need fake timers
(`vi.useFakeTimers({ shouldAdvanceTime: true })`).

`src/lib/__tests__/mapIcons.test.ts` pins the pin itself: the image url is carried, `contain`
is used and `cover` is not, the glyph stays behind the image, one object per url, and the two
escaping passes (percent-encoding a url that would close the attribute, and the `&` that
`encodeURI` leaves behind).

`lookupNearbyCatalogs.test.ts` pins the wire contract — `lat`/`lng` and nothing else,
`authenticated: false`, the echoed radius, a refused impossible point that never reaches the
network, and the 404/429/empty mappings. `plotShops.test.ts` pins the marker de-overlap:
separated, deterministic, nothing dropped, API order kept.

Cases 3, 5 and 7 are the regressions worth owning: the clamp is the acceptance criterion with no
visible symptom when it breaks, and 5/7 are the two halves of "usable button" that a naive
implementation gets wrong in opposite directions.

### `src/sections/home/__tests__/HomePage.test.tsx` — one added case

| # | Case | Assert |
|---|---|---|
| 9 | Comprar shows the map doorway | after `openComprar(user)`, a link named `Buscar catálogos en el mapa` with `href="/map"`, **and** it is present while `savedCatalogs` is still loading |

The second half of that assertion is the §2 decision pinned down.

### `src/lib/__tests__/geolocation.test.ts`

Three cases over the extracted wrapper — resolves with coords, rejects `'denied'`, rejects
`'unsupported'` — so `LocationMapPicker.test.tsx` can keep testing the picker's behaviour rather
than the browser API. The picker's three existing cases must stay green through the refactor: that
is the signal the extraction was faithful.

---

## 10. Order of work

1. **Extract** `src/lib/geolocation.ts` and `src/lib/mapIcons.ts`; refactor `LocationMapPicker` onto
   them. Its three tests stay green, unchanged. Nothing user-visible moves.
2. **`MapSearchCard` + the route**, wired to an empty `MapSearchPage`. The doorway works
   end-to-end; the destination is a stub.
3. **`SearchMap`** — `MapContainer`, tile layer, the zoom constants, the controller. Still no
   geolocation: it opens on `DEFAULT_CENTER`.
4. **`useMapSearchLocation` + the "me" dot + the notices** — the four states of §5.4.
5. **`RecenterButton`** — all three of its states.
6. **`MapSearchBar`** — the inert field and its caption.
7. **The lookup** (§7) — `lookupNearbyCatalogs`, then `useNearbyCatalogs` (the gate), then the
   image pins, their navigation, and `MapNotice`'s lookup branches.
8. **Tests** (§9).
9. `npm run build && npm run lint && npm test`. The suite is green at baseline, so any red is new.

Steps 1–3 are shippable on their own: a map screen that opens on the right city and pans, reachable
from Comprar. Step 4 is what makes it *this* feature.

---

## 11. Explicitly out of scope

- **No working search field.** §6 — the endpoint has no `?q=`.
- **No `skip` paging on `truncated`.** It is `false` on every real call today (200 results is far
  more than a 7 km circle holds), and each page would spend another lookup from a 6-per-minute
  budget. The flag is honoured in the copy (*"Más de N"*) so the day it flips we hear it from the
  UI rather than from a user.
- **No clustering.** `plotShops` de-overlaps identical points (§7.4); grouping dense areas into
  count bubbles is a different feature, and today's density does not need it.
- **No tags or category filter.** Factor 2 of the feature doc. They attach to this same endpoint
  when they land — plan for a filter, but do not build against a parameter that does not exist.
- **No delivery-radius awareness.** A shop 8 km away that delivers may beat one 500 m away that
  does not; `/lookup` ignores `catalog.deliveryType` and so does this screen.
- **No geocoding** — no "search by address", no reverse geocode of the user's position into a
  neighbourhood name. That is a third-party service with its own key, bill and privacy question.
- **No radius slider, no "buscar en esta zona" button.** The circle *is* the query (§7.1); a second
  control that also means "how far" would contradict it.
- **No seller map picker.** §7.7 — the real constraint on this feature, and its own story.
- **No continuous tracking.** `getCurrentPosition` on demand, never `watchPosition` (§5.4).
- **No guest access.** `/map` is behind `ProtectedRoute` even though `/lookup` is public. A public
  discovery map is a product decision about what strangers may see of a seller's position, and it is
  not this story's to make.
- **No route params and no deep link.** `/map` takes no `?lat=&lng=`. Sharing a viewport has its own
  question (what a shared link shows someone standing elsewhere), and inventing the param shape
  early fixes the answer before it is asked.
- **No lazy-loading of Leaflet.** It is already in the bundle for the catalog editor, so a
  `React.lazy` boundary here would split nothing. Revisit if the editor's picker ever leaves.
- **No `tailwind.config.js`, no new theme token.** The card, the "me" dot and the shop halo use
  `buy`, `service` and `primary`, which exist.
