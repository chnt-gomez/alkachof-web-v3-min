import { useEffect, useRef, useState } from 'react'
import { Camera, ImageIcon, Loader2, Trash2, X } from 'lucide-react'
import { ACCEPTED_TYPES, MAX_UPLOAD_BYTES, type ImagePresetName } from '@/lib/imagePresets'
import { resizeImage } from '@/lib/resizeImage'

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
  /**
   * Fires whenever the image stops being settled — while it is being optimised
   * for upload, and while it is uploading. Parent forms use it to disable their
   * submit: in deferred mode the resized file IS what the form sends, so saving
   * mid-resize would submit the form without it.
   */
  onBusyChange?: (busy: boolean) => void
  /**
   * Which size bound to shrink the pick to before it leaves the device. The
   * server re-encodes regardless, so this only decides how much the user has to
   * upload — but on mobile data that is the difference that matters.
   */
  preset: ImagePresetName
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
  onBusyChange,
  preset,
  alt,
  placeholder = 'Toca para agregar imagen',
  ariaLabel,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false)
  // Shrinking a phone photo can take seconds on a low-end device, so it gets its
  // own visible phase rather than looking like a frozen picker.
  const [processing, setProcessing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Preview urls we minted ourselves, released when replaced or unmounted.
  const previewUrl = useRef<string | null>(null)

  useEffect(() => () => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current)
  }, [])

  // Held in a ref so an inline arrow from the parent does not retrigger the
  // effect on every render.
  const notifyBusy = useRef(onBusyChange)
  notifyBusy.current = onBusyChange
  useEffect(() => {
    notifyBusy.current?.(processing || uploading)
  }, [processing, uploading])

  function showPreview(file: File) {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current)
    previewUrl.current = URL.createObjectURL(file)
    onChange(previewUrl.current)
  }

  async function handleFile(picked: File) {
    setError(null)
    if (!ACCEPTED_TYPES.includes(picked.type)) {
      setError('Formato no admitido. Usa JPG, PNG o WebP.')
      return
    }
    // Checked against the original: this is the API's own upload limit, and a
    // pick this large is worth rejecting before spending time decoding it.
    if (picked.size > MAX_UPLOAD_BYTES) {
      setError('La imagen excede el tamaño máximo de 10 MB.')
      return
    }

    // Shrinking happens before both modes: deferred mode hands the file to a
    // parent form that submits it as-is, so resizing only in the upload branch
    // would silently leave those uploads full size. Never throws — a browser
    // that cannot do it returns the original and the server resizes instead.
    //
    // The decode runs off the main thread (createImageBitmap) and the encode is
    // async, so the UI stays interactive throughout — this only marks the phase.
    setProcessing(true)
    let file = picked
    try {
      file = await resizeImage(picked, preset)
    } catch {
      // resizeImage is contracted never to throw. Belt and braces: if that ever
      // changes, send the original rather than stranding the pick — the server
      // re-encodes whatever it receives, so the upload still ends up bounded.
      file = picked
    } finally {
      setProcessing(false)
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

  const busy = processing || uploading || deleting

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className="flex w-full flex-col items-center justify-center overflow-hidden rounded-xl border bg-muted transition-opacity hover:opacity-80 disabled:opacity-50"
        onClick={() => setSheetOpen(true)}
        disabled={busy}
        aria-label={ariaLabel ?? (value ? 'Cambiar imagen' : 'Agregar imagen')}
        aria-busy={processing || uploading}
      >
        {processing ? (
          <div
            role="status"
            className="flex h-32 w-full items-center justify-center gap-2 text-sm text-muted-foreground"
          >
            <Loader2 size={16} className="animate-spin" />
            Optimizando imagen para internet…
          </div>
        ) : uploading ? (
          <div
            role="status"
            className="flex h-32 w-full items-center justify-center gap-2 text-sm text-muted-foreground"
          >
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
