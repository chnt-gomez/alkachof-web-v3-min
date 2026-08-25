import { describe, expect, it, vi } from 'vitest'
import { drawGeometry, resizeImage } from '@/lib/resizeImage'
import { IMAGE_PRESETS } from '@/lib/imagePresets'

const file = (name = 'photo.jpg', type = 'image/jpeg', size = 5_000_000) =>
  new File([new Uint8Array(size)], name, { type })

// jsdom implements neither getContext('2d') nor toBlob, so the encode path has
// to be stood up by hand. The geometry it would have used is asserted directly
// against drawGeometry above.
function stubCanvas(blob: Blob | null) {
  const drawImage = vi.fn()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage,
    imageSmoothingQuality: 'low',
  } as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb) => cb(blob))
  return { drawImage }
}

describe('drawGeometry', () => {
  describe('inside (products, catalogs)', () => {
    it('bounds a large photo to the preset and keeps its aspect ratio', () => {
      const { canvas } = drawGeometry({ width: 4032, height: 3024 }, IMAGE_PRESETS.products)

      expect(canvas).toEqual({ width: 1200, height: 900 }) // 4:3 preserved
    })

    it('bounds a portrait photo by its long edge', () => {
      const { canvas } = drawGeometry({ width: 3024, height: 4032 }, IMAGE_PRESETS.products)

      expect(canvas).toEqual({ width: 900, height: 1200 })
    })

    it('never enlarges an image already under the preset', () => {
      const { canvas } = drawGeometry({ width: 300, height: 200 }, IMAGE_PRESETS.catalogs)

      expect(canvas).toEqual({ width: 300, height: 200 })
    })

    it('draws the whole source frame', () => {
      const { source } = drawGeometry({ width: 4032, height: 3024 }, IMAGE_PRESETS.products)

      expect(source).toEqual({ x: 0, y: 0, width: 4032, height: 3024 })
    })
  })

  describe('cover (profiles)', () => {
    it('centre-crops a landscape photo to a square', () => {
      const { canvas, source } = drawGeometry({ width: 1200, height: 600 }, IMAGE_PRESETS.profiles)

      expect(canvas).toEqual({ width: 512, height: 512 })
      // The largest centred square the source allows: 600x600, offset on x only.
      expect(source).toEqual({ x: 300, y: 0, width: 600, height: 600 })
    })

    it('centre-crops a portrait photo on the other axis', () => {
      const { source } = drawGeometry({ width: 600, height: 1200 }, IMAGE_PRESETS.profiles)

      expect(source).toEqual({ x: 0, y: 300, width: 600, height: 600 })
    })

    it('never enlarges a small avatar to the preset', () => {
      const { canvas } = drawGeometry({ width: 200, height: 200 }, IMAGE_PRESETS.profiles)

      expect(canvas).toEqual({ width: 200, height: 200 })
    })
  })
})

describe('resizeImage', () => {
  // Every failure path returns the original: the API re-encodes whatever it
  // receives, so falling back costs upload bandwidth and nothing else. That is
  // what keeps this an optimisation rather than a correctness dependency.
  it('returns the original when the browser cannot decode the file', async () => {
    const original = file()
    const decode = vi.fn().mockRejectedValue(new Error('unsupported: HEIC'))

    const result = await resizeImage(original, 'products', decode)

    expect(result).toBe(original)
  })

  it('returns the original when createImageBitmap is unavailable', async () => {
    const original = file()

    const result = await resizeImage(original, 'products', undefined as never)

    expect(result).toBe(original)
  })

  it('asks the decoder to apply EXIF orientation', async () => {
    // Without this a portrait phone photo is drawn sideways, and because the
    // canvas output carries no EXIF the rotation becomes permanent.
    const decode = vi.fn().mockRejectedValue(new Error('stop after the call'))

    await resizeImage(file(), 'products', decode)

    expect(decode).toHaveBeenCalledWith(expect.any(File), { imageOrientation: 'from-image' })
  })

  it('returns the original when the canvas cannot encode webp', async () => {
    const original = file()
    const bitmap = { width: 4032, height: 3024, close: vi.fn() }
    const decode = vi.fn().mockResolvedValue(bitmap)
    // Emulate a browser that declines to encode webp.
    stubCanvas(null)

    const result = await resizeImage(original, 'products', decode)

    expect(result).toBe(original)
    expect(bitmap.close).toHaveBeenCalled()
    vi.restoreAllMocks()
  })

  it('keeps the original when re-encoding would make it bigger', async () => {
    const original = file('tiny.png', 'image/png', 800)
    const decode = vi.fn().mockResolvedValue({ width: 64, height: 64, close: vi.fn() })
    stubCanvas(new Blob([new Uint8Array(4000)], { type: 'image/webp' }))

    const result = await resizeImage(original, 'products', decode)

    expect(result).toBe(original)
    vi.restoreAllMocks()
  })

  it('returns a smaller webp file named for the original', async () => {
    const original = file('Vacation Photo.JPEG')
    const decode = vi.fn().mockResolvedValue({ width: 4032, height: 3024, close: vi.fn() })
    const { drawImage } = stubCanvas(new Blob([new Uint8Array(150_000)], { type: 'image/webp' }))

    const result = await resizeImage(original, 'products', decode)

    expect(result).not.toBe(original)
    expect(result.type).toBe('image/webp')
    expect(result.name).toBe('Vacation Photo.webp')
    expect(result.size).toBeLessThan(original.size)
    // Drawn at the bounded size, not the original 4032x3024.
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 4032, 3024, 0, 0, 1200, 900)
    vi.restoreAllMocks()
  })
})
