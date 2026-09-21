/**
 * The https half of R6. `location.protocol` is unforgeable in jsdom, so the two
 * cases cannot share a file: this one runs against an https document, and
 * `auth.test.ts` covers the http side.
 *
 * @vitest-environment-options { "url": "https://app.alkachof.mx/" }
 */
import { describe, expect, it, vi } from 'vitest'
import { setTokens } from '../auth'

describe('cookie attributes over https', () => {
  it('adds Secure', () => {
    const written: string[] = []
    vi.spyOn(document, 'cookie', 'set').mockImplementation((value: string) => {
      written.push(value)
      Reflect.set(Document.prototype, 'cookie', value, document)
    })

    expect(location.protocol).toBe('https:')
    setTokens('access-abc', 'refresh-xyz')

    expect(written).toHaveLength(2)
    expect(written.every((cookie) => cookie.includes('; Secure'))).toBe(true)
  })
})
