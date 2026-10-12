import L from 'leaflet'

/*
  Leaflet's default marker icon relies on bundled PNGs that don't resolve
  reliably under Vite, leaving the marker *invisible* — a failure that logs
  nothing anywhere. A CSS-only div icon always renders, so every marker in the
  app is built from one here.

  `className` is emptied on purpose: Leaflet's default (`leaflet-div-icon`)
  draws a white box with a border around whatever html it is given.
*/
function dotIcon(html: string, size: number): L.DivIcon {
  return L.divIcon({
    className: '',
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

/** A placed point: the catalog's own location, and later a shop on the map. */
export const PIN_ICON = dotIcon(
  '<span style="display:block;width:20px;height:20px;border-radius:9999px;' +
    'background:var(--color-primary);border:2px solid var(--color-ink);"></span>',
  20,
)

/**
 * The viewer's own position. Blue, ringed in white — the convention every maps
 * app has taught — and deliberately *not* `PIN_ICON`: the day the map carries
 * twenty catalog pins in `--color-primary`, "where am I" has to stay answerable
 * at a glance.
 */
export const USER_DOT_ICON = dotIcon(
  '<span style="display:block;width:18px;height:18px;border-radius:9999px;' +
    'background:var(--color-service);border:3px solid #fff;' +
    'box-shadow:0 0 0 1px var(--color-ink);"></span>',
  24,
)

/**
 * Leaflet injects `html` with `innerHTML`, so anything interpolated into it has
 * to be escaped — a catalog image url comes from the API and is not ours to
 * trust. `encodeURI` first (it takes `"` out of the css `url()` context), then
 * the four html-significant characters, because `&quot;` written literally in a
 * url would otherwise be decoded by the parser and close the attribute.
 */
function escapeAttribute(value: string): string {
  return encodeURI(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** lucide's `shopping-bag`, for a catalog with no image of its own. */
const BAG_GLYPH =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
  'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>' +
  '<path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>'

const SHOP_FRAME =
  // `position:relative` carries the image, which is layered over the glyph;
  // `box-sizing:border-box` keeps the badge exactly the `iconSize` Leaflet
  // positions it by, border included.
  'position:relative;box-sizing:border-box;display:flex;align-items:center;' +
  'justify-content:center;width:40px;height:40px;overflow:hidden;border-radius:12px;' +
  'border:2px solid var(--color-ink);background:var(--color-card);' +
  'color:var(--color-muted-foreground);box-shadow:0 1px 3px rgba(0,0,0,0.25)'

/*
  One icon object per image url, reused for the life of the tab.

  Not an optimisation for its own sake: `Marker`'s `icon` is compared by
  identity, so building a fresh `divIcon` each render would make react-leaflet
  tear down and rebuild every marker's DOM on every state change — with up to
  200 shops on screen. The cache grows by one small object per distinct catalog
  seen, which is bounded by how many shops the user pans past.
*/
const shopIcons = new Map<string, L.DivIcon>()

function shopIconHtml(imageUrl?: string): string {
  if (!imageUrl) return `<span style="${SHOP_FRAME}">${BAG_GLYPH}</span>`
  return (
    `<span style="${SHOP_FRAME}">${BAG_GLYPH}` +
    `<img src="${escapeAttribute(imageUrl)}" alt="" loading="lazy" decoding="async" ` +
    // A url that 404s would otherwise leave the browser's broken-image glyph in
    // the pin; removing the img uncovers the bag drawn behind it.
    `onerror="this.remove()" ` +
    `style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain">` +
    `</span>`
  )
}

/**
 * A shop from the proximity search: the catalog's own image in a small badge.
 *
 * **`object-fit:contain`, never `cover`** — the golden rule holds at 40px just
 * as `CatalogThumb` holds it at 44: a seller's image is their marketing and this
 * does not crop it. Which is also why the badge is a rounded square rather than
 * a circle: a contained image in a circle is a thin band across the middle.
 *
 * **A badge, not a teardrop pin, and nothing auto-zooms to it.** The API snaps
 * every result to a ~110 m grid so a seller's home cannot be enumerated, so a
 * marker is right to about 75 m — a pointed pin would claim a doorstep the data
 * does not know. The round blue dot stays reserved for "you are here".
 */
export function shopIcon(imageUrl?: string): L.DivIcon {
  const key = imageUrl ?? ''
  const cached = shopIcons.get(key)
  if (cached) return cached
  const icon = L.divIcon({
    className: '',
    html: shopIconHtml(imageUrl),
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  })
  shopIcons.set(key, icon)
  return icon
}
