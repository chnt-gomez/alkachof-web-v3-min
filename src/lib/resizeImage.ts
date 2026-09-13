import {
  IMAGE_PRESETS,
  OUTPUT_EXTENSION,
  OUTPUT_TYPE,
  type ImagePreset,
  type ImagePresetName,
} from '@/lib/imagePresets'

/**
 * Shrinks a picked image to its preset before upload, so a 5 MB phone photo
 * leaves the device as ~150 KB.
 *
 * **This never throws and never rejects.** Every failure path returns the
 * original file: an old browser without `createImageBitmap`, a codec the canvas
 * cannot encode, a HEIC the browser cannot decode. The API re-encodes whatever
 * it receives, so falling back costs upload bandwidth and nothing else —
 * which is what lets this stay a pure optimisation rather than a correctness
 * dependency.
 */
export async function resizeImage(
  file: File,
  presetName: ImagePresetName,
  decode: typeof createImageBitmap = globalThis.createImageBitmap,
): Promise<File> {
  const preset = IMAGE_PRESETS[presetName]
  if (typeof decode !== 'function' || typeof document === 'undefined') return file

  let bitmap: ImageBitmap
  try {
    // `from-image` applies the EXIF orientation flag during decode. Without it
    // every portrait phone photo is drawn to the canvas on its side — and since
    // the canvas output carries no EXIF, the sideways version becomes permanent.
    bitmap = await decode(file, { imageOrientation: 'from-image' })
  } catch {
    return file
  }

  try {
    const blob = await drawToBlob(bitmap, preset)
    if (!blob) return file

    // An already-small, well-compressed image can come back bigger than it went
    // in. Keep whichever is smaller — re-encoding is not worth losing to.
    if (blob.size >= file.size) return file

    return new File([blob], toWebpName(file.name), { type: OUTPUT_TYPE, lastModified: Date.now() })
  } catch {
    return file
  } finally {
    bitmap.close?.()
  }
}

/** Target canvas size, and the source rectangle drawn into it. */
export function drawGeometry(source: { width: number; height: number }, preset: ImagePreset) {
  const { width: sw, height: sh } = source

  if (preset.fit === 'cover') {
    // Centre-crop the largest square the source allows, then scale it down to
    // the preset — but never up, matching sharp's `withoutEnlargement`.
    const cropSize = Math.min(sw, sh)
    const side = Math.min(preset.width, preset.height, cropSize)
    return {
      canvas: { width: side, height: side },
      source: { x: (sw - cropSize) / 2, y: (sh - cropSize) / 2, width: cropSize, height: cropSize },
    }
  }

  // `inside`: fit within the box, preserving aspect ratio, never enlarging.
  const scale = Math.min(preset.width / sw, preset.height / sh, 1)
  return {
    canvas: { width: Math.round(sw * scale), height: Math.round(sh * scale) },
    source: { x: 0, y: 0, width: sw, height: sh },
  }
}

function drawToBlob(bitmap: ImageBitmap, preset: ImagePreset): Promise<Blob | null> {
  const { canvas: size, source } = drawGeometry(bitmap, preset)

  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height

  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.resolve(null)

  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(
    bitmap,
    source.x, source.y, source.width, source.height,
    0, 0, size.width, size.height,
  )

  return new Promise((resolve) => {
    // A browser that cannot encode WebP hands back null (or a PNG); either way
    // the caller falls back to the original rather than uploading something odd.
    canvas.toBlob(
      (blob) => resolve(blob && blob.type === OUTPUT_TYPE ? blob : null),
      OUTPUT_TYPE,
      preset.quality,
    )
  })
}

function toWebpName(name: string) {
  return `${name.replace(/\.[^./\\]+$/, '') || 'image'}${OUTPUT_EXTENSION}`
}
