import { useEffect, useRef, useState } from 'react'
import { Copy, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/useToast'
import { copyText, copyTextSync } from '@/lib/clipboard'
import { resolveMediaUrl } from '@/lib/mediaUrl'
import { catalogShareUrl } from '@/lib/shareUrl'

type Props = {
  catalogId: string
  catalogName: string
  /** Public url of the catalog's QR code (`catalog.qr`); absent until the backend mints it. */
  qr?: string
  onClose: () => void
}

/**
 * Explains the value of sharing, then copies the public catalog link and opens
 * the native share sheet (WhatsApp, etc.) in a single tap. On browsers without
 * the Web Share API, it just confirms the copy with a toast. Also shows the
 * catalog's permanent QR code so nearby customers can scan straight in.
 */
export function ShareCatalogDialog({ catalogId, catalogName, qr, onClose }: Props) {
  const toast = useToast()
  const shareUrl = catalogShareUrl(catalogId)
  // `catalog.qr` is an absolute url the API minted and stored. Codes written
  // while the API had no PUBLIC_URL carry a localhost origin no phone can
  // reach, so repoint it at the real API before the browser fetches it.
  const qrSrc = resolveMediaUrl(qr)

  // The QR is a remote image and can take seconds on mobile data, so the slot
  // holds a spinner until it decodes instead of collapsing to blank space.
  const [qrStatus, setQrStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const qrRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    setQrStatus('loading')
    // A cached image can finish before React attaches onLoad, so read the
    // element's own state once on mount instead of waiting for an event.
    const img = qrRef.current
    if (img?.complete) setQrStatus(img.naturalWidth > 0 ? 'ready' : 'error')
  }, [qrSrc])

  async function handleShare() {
    // Copy FIRST and synchronously. This is the only ordering that works on a
    // phone: it finishes before the share sheet takes focus away (which makes
    // Firefox reject a pending writeText), it still works over plain http
    // where navigator.clipboard does not exist at all, and it leaves the user
    // activation intact so navigator.share() below can still open.
    const copied = copyTextSync(shareUrl)

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: catalogName,
          text: `Mira mi catálogo en Alkachof: ${catalogName}`,
          url: shareUrl,
        })
      } catch {
        // Sheet dismissed, or sharing refused. Either way the link is on the
        // clipboard, so there is nothing to report.
      }
      onClose()
      return
    }

    // No native share: this button is now purely a copy, so say what actually
    // happened instead of claiming success. The async Clipboard API is the
    // backstop here — with no share sheet to open, awaiting it costs nothing.
    if (copied || (await copyText(shareUrl))) {
      toast.success('Link copiado al portapapeles')
      onClose()
      return
    }

    // Nothing worked. Stay open: the link is on screen below, so the user can
    // still select it by hand.
    toast.error('No pudimos copiar el link. Mantenlo presionado para copiarlo.')
  }

  return (
    <Dialog onClose={onClose} ariaLabel="Compartir catálogo" title="Comparte tu catálogo">
      <div className="flex flex-col gap-5 p-5">
        <p className="text-sm text-muted-foreground">
          Comparte el link de tu catálogo en redes y aplicaciones de mensajería para que tus
          clientes conozcan tus productos. Invítalos a que se suscriban para que reciban tus
          anuncios.
        </p>

        <Button size="lg" className="w-full" onClick={() => void handleShare()}>
          <Copy size={16} />
          Copiar link
        </Button>

        {/* The link in plain sight, so a browser that refuses every programmatic
            copy still leaves the user a way out: select it, or long-press it. */}
        <p className="-mt-2 break-all text-center text-xs text-muted-foreground select-all">
          {shareUrl}
        </p>

        {qrSrc && (
          <div className="flex flex-col items-center gap-3 border-t pt-5">
            <p className="text-center text-sm text-muted-foreground">
              O muestra este código para que tus clientes cercanos escaneen y entren directo a tu
              catálogo.
            </p>

            <div className="w-full max-w-[220px]">
              {qrStatus !== 'ready' && (
                <div
                  role="status"
                  aria-busy={qrStatus === 'loading'}
                  className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-lg bg-muted text-sm text-muted-foreground"
                >
                  {qrStatus === 'loading' ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Cargando código QR…
                    </>
                  ) : (
                    <span className="px-4 text-center">No pudimos cargar el código QR.</span>
                  )}
                </div>
              )}
              {/* Kept mounted while loading (display:none still fetches) so the
                  load/error events fire and the spinner can hand over. */}
              <img
                ref={qrRef}
                src={qrSrc}
                alt="Código QR de tu catálogo"
                className={qrStatus === 'ready' ? 'w-full object-contain' : 'hidden'}
                onLoad={() => setQrStatus('ready')}
                onError={() => setQrStatus('error')}
              />
            </div>

            <Button asChild size="sm" variant="outline">
              <a href={qrSrc} download="qr-catalogo.png">
                <Download size={14} />
                Descargar QR
              </a>
            </Button>
          </div>
        )}
      </div>
    </Dialog>
  )
}
