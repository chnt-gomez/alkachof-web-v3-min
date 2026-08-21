import { useEffect, useRef, useState } from 'react'
import { Camera, ImageIcon, Loader2, Trash2, X } from 'lucide-react'

// Must stay in step with the API's multer fileFilter (`api/util/storageFactory.js`):
// JPEG/PNG only, 10 MB. WebP is deliberately absent — the server rejects it, and
// its multer error surfaces as an opaque 500, so we reject it up front instead.
const ACCEPTED_TYPES = ['image/jpeg', 'image/png']
const MAX_BYTES = 10 * 1024 * 1024

type Props = {
  value: string
  onChange: (url: string) => void
  /**
   * Upload-now mode: persists the file right away and resolves to its url.
   * Mutually exclusive with `onFileSelect` — pass exactly one.
   */
  upload?: (file: File) => Promise<string>
  /**
   * Deferred mode: the picked file is handed to the parent form, which sends it
   * as part of its own multipart submit. `onChange` still receives a local
   * preview url so the field renders the choice immediately.
   */
  onFileSelect?: (file: File) => void
  /**
   * Removes the persisted image. The control renders only when this is provided
   * and there is a `value`, so callers without a delete endpoint are untouched.
   */
  onDelete?: () => Promise<void>
  alt?: string
  placeholder?: string
  ariaLabel?: string
}

export function ImageUploadField({
  value,
  onChange,
  upload,
  onFileSelect,
  onDelete,
  alt,
  placeholder = 'Toca para agregar imagen',
  ariaLabel,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Preview urls we minted ourselves, released when replaced or unmounted.
  const previewUrl = useRef<string | null>(null)

  useEffect(() => () => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current)
  }, [])

  function showPreview(file: File) {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current)
    previewUrl.current = URL.createObjectURL(file)
    onChange(previewUrl.current)
  }

  async function handleFile(file: File) {
    setError(null)
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Formato no admitido. Usa JPG o PNG.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('La imagen excede el tamaño máximo de 10 MB.')
      return
    }
    if (!upload) {
      showPreview(file)
      onFileSelect?.(file)
      return
    }
    setUploading(true)
    try {
      const url = await upload(file)
      onChange(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir la imagen.')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete() {
    if (!onDelete) return
    setError(null)
    setDeleting(true)
    try {
      await onDelete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo quitar la imagen.')
    } finally {
      setDeleting(false)
    }
  }

  const busy = uploading || deleting

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className="flex w-full flex-col items-center justify-center overflow-hidden rounded-xl border bg-muted transition-opacity hover:opacity-80 disabled:opacity-50"
        onClick={() => setSheetOpen(true)}
        disabled={busy}
        aria-label={ariaLabel ?? (value ? 'Cambiar imagen' : 'Agregar imagen')}
        aria-busy={uploading}
      >
        {uploading ? (
          <div className="flex h-32 w-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={16} className="animate-spin" />
            Subiendo imagen…
          </div>
        ) : value ? (
          <img src={value} alt={alt ?? 'Imagen'} className="w-full object-contain" />
        ) : (
          <div className="flex h-32 w-full items-center justify-center text-xs text-muted-foreground">
            {placeholder}
          </div>
        )}
      </button>

      {onDelete && value && (
        <button
          type="button"
          onClick={() => void handleDelete()}
          disabled={busy}
          aria-busy={deleting}
          className="flex items-center gap-1.5 self-start rounded-lg px-2 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
        >
          {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
          {deleting ? 'Quitando…' : 'Quitar imagen'}
        </button>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {sheetOpen && (
        <PickerSheet
          onClose={() => setSheetOpen(false)}
          onPick={(file) => {
            setSheetOpen(false)
            void handleFile(file)
          }}
        />
      )}
    </div>
  )
}

function PickerSheet({ onClose, onPick }: { onClose: () => void; onPick: (file: File) => void }) {
  const galleryRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onPick(file)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl bg-background p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Seleccionar imagen</p>
          <button onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <button
            className="flex items-center gap-3 rounded-xl border p-4 text-left text-sm font-medium transition-colors hover:bg-muted"
            onClick={() => galleryRef.current?.click()}
          >
            <ImageIcon size={20} className="text-primary" />
            Galería
          </button>
          <button
            className="flex items-center gap-3 rounded-xl border p-4 text-left text-sm font-medium transition-colors hover:bg-muted"
            onClick={() => cameraRef.current?.click()}
          >
            <Camera size={20} className="text-primary" />
            Cámara
          </button>
        </div>

        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleChange}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleChange}
        />
      </div>
    </div>
  )
}
