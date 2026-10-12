import { describe, expect, it } from 'vitest'
import { shopIcon } from '../mapIcons'

const html = (url?: string) => shopIcon(url).options.html as string

describe('shopIcon', () => {
  it("carries the catalog's image", () => {
    expect(html('https://images.alkachof.mx/pan.webp')).toContain(
      'src="https://images.alkachof.mx/pan.webp"',
    )
  })

  // The golden rule holds at 40px: a seller's image is their marketing.
  it('fits the image instead of cropping it', () => {
    expect(html('https://images.alkachof.mx/pan.webp')).toContain('object-fit:contain')
    expect(html('https://images.alkachof.mx/pan.webp')).not.toContain('cover')
  })

  it('falls back to a glyph with no image, and keeps it behind one', () => {
    expect(html()).toContain('<svg')
    expect(html()).not.toContain('<img')
    // Drawn behind the image too, so a url that 404s uncovers it.
    expect(html('https://images.alkachof.mx/pan.webp')).toContain('<svg')
  })

  // Leaflet injects this with innerHTML and the url comes from the api.
  it('percent-encodes a url that would close the attribute', () => {
    const escaped = html('https://x.test/a"><script>alert(1)</script>')

    expect(escaped).not.toContain('<script>')
    expect(escaped).toContain('%22')
    expect(escaped).toContain('%3Cscript%3E')
  })

  // The second pass: `encodeURI` leaves `&` alone, and a literal `&quot;` in a
  // url would be decoded back into a quote by the html parser.
  it('escapes ampersands a url is allowed to contain', () => {
    const escaped = html('https://x.test/a?w=40&quot;')

    expect(escaped).toContain('&amp;quot;')
    expect(escaped).not.toContain('?w=40&quot;')
  })

  it('reuses one icon object per url', () => {
    // `Marker` compares `icon` by identity: a fresh object every render would
    // rebuild every marker's DOM.
    expect(shopIcon('https://images.alkachof.mx/pan.webp')).toBe(
      shopIcon('https://images.alkachof.mx/pan.webp'),
    )
    expect(shopIcon()).toBe(shopIcon())
  })
})
