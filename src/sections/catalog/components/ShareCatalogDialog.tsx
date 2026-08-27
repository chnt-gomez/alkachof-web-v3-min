import { Copy, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/useToast'
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

  function handleShare() {
    // Copy in the background so the link is on the clipboard either way. Don't
    // await it — that would spend the user gesture navigator.share() needs.
    void navigator.clipboard?.writeText(shareUrl).catch(() => {})

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      navigator
        .share({
          title: catalogName,
          text: `Mira mi catálogo en Alkachof: ${catalogName}`,
          url: shareUrl,
        })
        .catch(() => {
          // Share sheet dismissed — the link is already copied, so stay quiet.
        })
    } else {
      // No native share (typically a desktop browser).
      toast.success('Mensaje copiado al portapapeles')
    }

    onClose()
  }

  return (
    <Dialog onClose={onClose} ariaLabel="Compartir catálogo" title="Comparte tu catálogo">
      <div className="flex flex-col gap-5 p-5">
        <p className="text-sm text-muted-foreground">
          Comparte el link de tu catálogo en redes y aplicaciones de mensajería para que tus
          clientes conozcan tus productos. Invítalos a que se suscriban para que reciban tus
          anuncios.
        </p>

        <Button size="lg" className="w-full" onClick={handleShare}>
          <Copy size={16} />
          Copiar link
        </Button>

        {qr && (
          <div className="flex flex-col items-center gap-3 border-t pt-5">
            <p className="text-center text-sm text-muted-foreground">
              O muestra este código para que tus clientes cercanos escaneen y entren directo a tu
              catálogo.
            </p>
            <img
              src={qr}
              alt="Código QR de tu catálogo"
              className="w-full max-w-[220px] object-contain"
            />
            <Button asChild size="sm" variant="outline">
              <a href={qr} download="qr-catalogo.png">
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
