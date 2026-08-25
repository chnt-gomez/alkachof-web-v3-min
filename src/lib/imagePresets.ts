/**
 * Image bounds, mirroring the API's `CONSTANTS.IMAGE` in
 * `alkachof-api/api/constants/constants.js`. **Keep the two in step.**
 *
 * Resizing here is an optimisation, not enforcement: it saves the user's upload
 * bandwidth and keeps the work off the VPS. The server re-encodes whatever
 * arrives regardless, so a browser that cannot do this (or gets it wrong) still
 * ends up with a correctly bounded image — it just pays to upload the original.
 *
 * Sizes come from what actually renders: the product detail dialog is
 * `max-w-md` (448 CSS px), so 1200 covers it at ~2.7x DPR.
 */
export type ImagePreset = {
  width: number
  height: number
  /** `inside` preserves aspect ratio; `cover` centre-crops to a square. */
  fit: 'inside' | 'cover'
  /** 0-1 for canvas.toBlob. The API expresses the same value as 0-100. */
  quality: number
}

export type ImagePresetName = 'profiles' | 'products' | 'catalogs'

export const IMAGE_PRESETS: Record<ImagePresetName, ImagePreset> = {
  profiles: { width: 512, height: 512, fit: 'cover', quality: 0.8 },
  products: { width: 1200, height: 1200, fit: 'inside', quality: 0.8 },
  catalogs: { width: 1600, height: 1600, fit: 'inside', quality: 0.8 },
}

/**
 * WebP everywhere: ~25-35% smaller than JPEG at equal perceptual quality, and it
 * keeps alpha so a logo with transparency does not gain a black background.
 */
export const OUTPUT_TYPE = 'image/webp'
export const OUTPUT_EXTENSION = '.webp'

/**
 * What the API's multer will take in. Enforced here too so an oversized pick
 * fails immediately with a useful message instead of after a long upload.
 */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

/**
 * WebP is accepted now — the API re-encodes every upload, so the input format
 * only has to be something it can decode. This previously listed JPEG/PNG only,
 * because the server rejected WebP and the rejection surfaced as an opaque 500.
 */
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
