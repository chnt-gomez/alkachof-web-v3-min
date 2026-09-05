import { AlertCircle, Check, Instagram, LoaderCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/useToast'
import { useInstagramImport, isSelectablePost } from '../hooks/useInstagramImport'
import { MAX_POSTS_PER_IMPORT } from '../actions/importInstagramPosts'
import { InstagramPostGrid } from './InstagramPostGrid'

type Props = {
  /** Reload the catalog's items so the freshly created products appear. */
  onImported: () => void
  onClose: () => void
}

/**
 * "Importar de Instagram" — the whole Phyllo flow in one dialog: connect, pick
 * photos, import, read the summary.
 *
 * Only photos are importable, and imports use the API's defaults (name from the
 * caption's first line, no price), so a freshly imported product is priced in
 * the catalog afterwards like any other unpriced item.
 */
export function InstagramImportDialog({ onImported, onClose }: Props) {
  const toast = useToast()
  const {
    status,
    username,
    isLoadingAccount,
    isConnecting,
    posts,
    isLoadingPosts,
    isImporting,
    selected,
    error,
    summary,
    connect,
    reload,
    reloadPosts,
    toggle,
    clearSelection,
    runImport,
    dismissSummary,
  } = useInstagramImport(onImported)

  const importable = posts.filter(isSelectablePost)
  const atLimit = selected.length >= MAX_POSTS_PER_IMPORT
  const busy = isConnecting || isImporting

  async function handleImport() {
    const result = await runImport()
    // Null means the whole batch was rejected — the error box already says why.
    if (!result || result.importedCount === 0) return
    toast.success(
      result.importedCount === 1
        ? 'Se agregó 1 artículo a tu catálogo.'
        : `Se agregaron ${result.importedCount} artículos a tu catálogo.`,
    )
  }

  return (
    <Dialog
      onClose={busy ? () => {} : onClose}
      ariaLabel="Importar de Instagram"
      title="Importar de Instagram"
      className="max-w-lg"
    >
      <div className="flex flex-col gap-4 p-5">
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div className="flex flex-col items-start gap-2">
              <span>{error.message}</span>
              {error.retry && !busy && (
                <Button size="sm" variant="outline" onClick={reload}>
                  <RefreshCw size={14} />
                  Reintentar
                </Button>
              )}
            </div>
          </div>
        )}

        {summary && (
          <div className="flex flex-col gap-2 rounded-xl border p-3">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Check size={16} className="text-primary" />
              {summary.importedCount === 1
                ? 'Se importó 1 publicación.'
                : `Se importaron ${summary.importedCount} publicaciones.`}
            </p>
            {summary.skipped.length > 0 && (
              <>
                <p className="text-sm text-muted-foreground">
                  {summary.skipped.length === 1
                    ? 'No pudimos importar 1 publicación:'
                    : `No pudimos importar ${summary.skipped.length} publicaciones:`}
                </p>
                <ul className="flex list-disc flex-col gap-1 pl-5 text-xs text-muted-foreground">
                  {summary.skipped.map((skip) => (
                    <li key={skip.contentId}>{skipReasonLabel(skip.reason)}</li>
                  ))}
                </ul>
              </>
            )}
            <Button size="sm" variant="outline" className="self-start" onClick={dismissSummary}>
              Entendido
            </Button>
          </div>
        )}

        {isLoadingAccount || isConnecting ? (
          <div className="flex flex-col items-center gap-3 py-10" aria-busy="true">
            <LoaderCircle size={24} className="animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {isConnecting ? 'Conectando con Instagram…' : 'Revisando tu cuenta…'}
            </p>
          </div>
        ) : status === 'CONNECTED' ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 truncate text-sm text-muted-foreground">
                {username ? `Conectado como @${username}` : 'Instagram conectado'}
              </p>
              <Button
                size="sm"
                variant="ghost"
                onClick={reloadPosts}
                disabled={isLoadingPosts || isImporting}
              >
                <RefreshCw size={14} />
                Actualizar
              </Button>
            </div>

            {isLoadingPosts ? (
              <div className="flex flex-col items-center gap-3 py-10" aria-busy="true">
                <LoaderCircle size={24} className="animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Cargando tus publicaciones…</p>
              </div>
            ) : posts.length === 0 ? (
              <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                No encontramos publicaciones en tu Instagram.
              </p>
            ) : importable.length === 0 ? (
              <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                Ya importaste todas las fotos de tu Instagram. Publica algo nuevo y vuelve aquí.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Elige hasta {MAX_POSTS_PER_IMPORT} fotos. Cada una se convierte en un artículo de
                  tu catálogo, sin precio — se lo pones después.
                </p>
                <InstagramPostGrid
                  posts={posts}
                  selected={selected}
                  atLimit={atLimit}
                  disabled={isImporting}
                  onToggle={toggle}
                />
              </>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-6 text-center">
            <Instagram size={28} className="text-primary" />
            <p className="text-sm font-semibold">
              {status === 'SESSION_EXPIRED'
                ? 'Vuelve a conectar tu Instagram'
                : 'Conecta tu Instagram'}
            </p>
            <p className="text-sm text-muted-foreground">
              {status === 'SESSION_EXPIRED'
                ? 'Tu conexión con Instagram caducó. Vuelve a autorizarla para seguir importando tus fotos.'
                : 'Autoriza el acceso a tus publicaciones para convertir tus fotos en artículos de tu catálogo.'}
            </p>
            <Button onClick={connect} disabled={busy}>
              <Instagram size={16} />
              {status === 'SESSION_EXPIRED' ? 'Reconectar Instagram' : 'Conectar Instagram'}
            </Button>
          </div>
        )}
      </div>

      {status === 'CONNECTED' && importable.length > 0 && (
        <div className="sticky bottom-0 flex flex-col gap-2 border-t bg-background px-5 py-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {selected.length} de {MAX_POSTS_PER_IMPORT} seleccionadas
            </span>
            {selected.length > 0 && !isImporting && (
              <button type="button" onClick={clearSelection} className="underline">
                Quitar selección
              </button>
            )}
          </div>
          {atLimit && !isImporting && (
            <p className="text-xs text-muted-foreground">
              Llegaste al máximo por importación. Puedes importar más en una segunda tanda.
            </p>
          )}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={isImporting}>
              Cerrar
            </Button>
            <Button
              className="flex-1"
              onClick={handleImport}
              disabled={selected.length === 0 || isImporting}
            >
              {isImporting ? (
                <>
                  <LoaderCircle size={16} className="animate-spin" />
                  Importando…
                </>
              ) : (
                <>
                  <Instagram size={16} />
                  Importar {selected.length > 0 ? selected.length : ''}
                </>
              )}
            </Button>
          </div>
          {isImporting && (
            <p className="text-center text-xs text-muted-foreground">
              Esto puede tardar unos segundos. No cierres esta ventana.
            </p>
          )}
        </div>
      )}
    </Dialog>
  )
}

/** The API's skip reasons are English and internal; these are what sellers read. */
function skipReasonLabel(reason: string): string {
  switch (reason) {
    case 'That post has already been imported':
      return 'Ya la habías importado.'
    case "That post is not in this seller's imported feed":
      return 'Ya no está en tu feed. Actualiza y vuelve a intentarlo.'
    case 'That post has no downloadable image':
      return 'No pudimos descargar su imagen. Actualiza y vuelve a intentarlo.'
    case 'Max items reached':
      return 'Tu catálogo llegó al máximo de artículos.'
    default:
      return reason
  }
}
