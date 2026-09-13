import { useEffect } from 'react'
import { AlertCircle, Instagram, LoaderCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/useToast'
import {
  useInstagramImport,
  isSelectablePost,
  attestationTextFor,
} from '../hooks/useInstagramImport'
import { MAX_CATALOG_ITEMS, remainingCatalogSlots } from '@/lib/catalogLimits'
import { InstagramPostGrid } from './InstagramPostGrid'
import { InstagramSearchForm } from './InstagramSearchForm'
import { InstagramProfilePicker } from './InstagramProfilePicker'
import { InstagramAttestation } from './InstagramAttestation'
import { InstagramPrivateNotice } from './InstagramPrivateNotice'
import { InstagramImportSuccess } from './InstagramImportSuccess'
import { InstagramCooldownNotice } from './InstagramCooldownNotice'

type Props = {
  /**
   * How many items the catalog already holds. It is what bounds the selection:
   * a seller may import every photo that still fits, up to the catalog's cap of
   * `MAX_CATALOG_ITEMS` — never a smaller number of its own, because they get
   * one metered run per cooldown and anything left behind waits a week.
   */
  itemCount: number
  /** Reload the catalog's items so the freshly created products appear. */
  onImported: () => void
  onClose: () => void
}

/**
 * "Importar de Instagram" — the whole flow in one dialog.
 *
 * Two halves. A seller who has never linked an account walks the enrollment
 * wizard (search → pick → attest); one who already has goes straight to their
 * feed. The wizard exists once per account and is unreachable afterwards, because
 * the link is permanent — there is no endpoint to switch or unlink, and that is
 * what keeps this from being a way to read arbitrary Instagram accounts.
 *
 * Only photos are importable, and imports use the API's defaults (name from the
 * caption's first line, no price), so a freshly imported product is priced in the
 * catalog afterwards like any other unpriced item.
 */
/** Long enough to read one line, short enough not to feel stuck. */
const AUTO_CLOSE_MS = 2200

export function InstagramImportDialog({ itemCount, onImported, onClose }: Props) {
  const toast = useToast()
  const remaining = remainingCatalogSlots(itemCount)
  const {
    phase,
    query,
    candidates,
    attestation,
    selectedProfile,
    attested,
    isSearching,
    isEnrolling,
    posts,
    isLoadingPosts,
    isImporting,
    selected,
    error,
    privateAlias,
    summary,
    cooldownUntil,
    cooldownDays,
    search,
    selectProfile,
    backToPicking,
    backToSearch,
    dismissPrivateNotice,
    setAttested,
    confirmEnrollment,
    reload,
    toggle,
    clearSelection,
    runImport,
    maxSelectable,
  } = useInstagramImport(onImported, remaining)

  const importable = posts.filter(isSelectablePost)
  const atLimit = selected.length >= maxSelectable
  /** True only when the catalog itself is what shortens the selection. */
  const boundedByCatalog = maxSelectable < MAX_CATALOG_ITEMS
  const busy = isImporting || isEnrolling

  /**
   * A clean import closes the dialog on its own; a partial one waits for a tap,
   * because the skipped list is the only place those reasons appear and a screen
   * that vanishes mid-read is worse than one extra tap.
   */
  const autoClosing = phase === 'done' && summary !== null && summary.skipped.length === 0

  useEffect(() => {
    if (!autoClosing) return
    const timer = setTimeout(onClose, AUTO_CLOSE_MS)
    return () => clearTimeout(timer)
  }, [autoClosing, onClose])

  async function handleImport() {
    const result = await runImport()
    // Null means the whole batch was rejected — the error box already says why.
    if (!result || result.importedCount === 0) return
    // The toast outlives the dialog, so the confirmation survives the close.
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

        {/*
          A private account is terminal for that handle — retrying changes
          nothing until the seller edits a setting on Instagram — so it takes
          over the screen instead of appearing as one more retryable error.
        */}
        {privateAlias ? (
          <InstagramPrivateNotice alias={privateAlias} onDismiss={dismissPrivateNotice} />
        ) : phase === 'cooldown' ? (
          /*
            Terminal, like the private-account screen and for the same shape of
            reason: there is nothing on this screen a tap could change. Reading
            the feed is a billed scraper run and the seller has spent theirs.
          */
          <InstagramCooldownNotice
            until={cooldownUntil}
            cooldownDays={cooldownDays}
            onClose={onClose}
          />
        ) : phase === 'done' && summary ? (
          <InstagramImportSuccess summary={summary} autoClosing={autoClosing} onClose={onClose} />
        ) : phase === 'checking' ? (
          <div className="flex flex-col items-center gap-3 py-10" aria-busy="true">
            <LoaderCircle size={24} className="animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Revisando tu cuenta…</p>
          </div>
        ) : phase === 'searching' ? (
          <InstagramSearchForm initialQuery={query} isSearching={isSearching} onSearch={search} />
        ) : phase === 'picking' ? (
          <InstagramProfilePicker
            query={query}
            candidates={candidates}
            onSelect={selectProfile}
            onSearchAgain={backToSearch}
          />
        ) : phase === 'attesting' && selectedProfile ? (
          <InstagramAttestation
            candidate={selectedProfile}
            attestationText={attestationTextFor(attestation, selectedProfile)}
            attested={attested}
            isEnrolling={isEnrolling}
            onAttestedChange={setAttested}
            onConfirm={confirmEnrollment}
            onBack={backToPicking}
          />
        ) : (
          <>
            {/*
              No "conectado como @x" line: the API never returns the linked
              handle, and showing it back would be the leak the design removes.

              And no refresh button. Re-reading the feed is a billed scraper run
              and the seller has nothing to gain from one — the feed is fetched
              fresh every time this dialog opens, and Instagram posts do not
              change between two taps a second apart. It was a paid gesture that
              bought nothing.
            */}
            <p className="min-w-0 truncate text-sm text-muted-foreground">Tus publicaciones</p>

            {isLoadingPosts ? (
              <div className="flex flex-col items-center gap-3 py-10" aria-busy="true">
                <LoaderCircle size={24} className="animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Cargando tus publicaciones…</p>
              </div>
            ) : posts.length === 0 ? (
              <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                No encontramos publicaciones en tu Instagram.
              </p>
            ) : maxSelectable === 0 ? (
              /*
                Unreachable from the catalog screen, which disables the entry
                point when the catalog is full — kept so a full catalog can never
                render a feed offering "0 de 0 seleccionadas".
              */
              <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                Tu catálogo está lleno: {MAX_CATALOG_ITEMS} artículos es el máximo. Elimina alguno
                para importar más fotos.
              </p>
            ) : importable.length === 0 ? (
              <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                Ya importaste todas las fotos de tu Instagram. Publica algo nuevo y vuelve aquí.
              </p>
            ) : (
              <>
                {/*
                  The number quoted here is the seller's remaining catalog
                  space, not a per-import quota — they may take everything that
                  still fits. Saying *why* it is short matters: a seller told
                  "elige hasta 22" with no reason reads it as an arbitrary
                  Instagram rule and goes looking for a way around it, when the
                  fix is on this side (delete an item, or price the ones already
                  there).
                */}
                <p className="text-sm text-muted-foreground">
                  {boundedByCatalog ? (
                    <>
                      Puedes importar {maxSelectable} {maxSelectable === 1 ? 'foto' : 'fotos'}: tu
                      catálogo admite {MAX_CATALOG_ITEMS} artículos y ya tienes {itemCount}. Cada una
                      se convierte en un artículo, sin precio — se lo pones después.
                    </>
                  ) : (
                    <>
                      Elige hasta {MAX_CATALOG_ITEMS} fotos. Cada una se convierte en un artículo de
                      tu catálogo, sin precio — se lo pones después.
                    </>
                  )}
                </p>
                {/*
                  Stated before the seller commits, not after. Reading the feed
                  is a billed scraper run and importing spends it, so this is a
                  one-shot screen: the photos left unselected wait a week. A
                  seller who learns that on the success screen has already lost
                  the choice it was meant to inform.
                */}
                <p
                  role="note"
                  className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground"
                >
                  <strong className="font-semibold text-foreground">
                    Solo puedes importar una vez cada {cooldownDays} días.
                  </strong>{' '}
                  Elige ahora todas las que quepan en tu catálogo — las que dejes fuera tendrán
                  que esperar hasta tu próxima importación.
                </p>
                <InstagramPostGrid
                  posts={posts}
                  selected={selected}
                  atLimit={atLimit}
                  disabled={isImporting}
                  onToggle={toggle}
                />
                {/*
                  One bounded page, and no way to ask for another. The scraper
                  has no resume cursor into Instagram, so a "Cargar más" would
                  mean a second full run re-scraping from the top — the same
                  billed run a refresh control would have bought. Reopening the
                  dialog is the only thing that reads the feed.
                */}
                <p className="text-center text-xs text-muted-foreground">
                  Mostrando tus publicaciones más recientes.
                </p>
              </>
            )}
          </>
        )}
      </div>

      {phase === 'browsing' && !privateAlias && importable.length > 0 && maxSelectable > 0 && (
        <div className="sticky bottom-0 flex flex-col gap-2 border-t bg-background px-5 py-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {selected.length} de {maxSelectable} seleccionadas
            </span>
            {selected.length > 0 && !isImporting && (
              <button type="button" onClick={clearSelection} className="underline">
                Quitar selección
              </button>
            )}
          </div>
          {atLimit && !isImporting && (
            <p className="text-xs text-muted-foreground">
              {boundedByCatalog
                ? `Es todo lo que le queda a tu catálogo: ${MAX_CATALOG_ITEMS} artículos como máximo, y ya tienes ${itemCount}.`
                : `Llegaste al máximo de ${MAX_CATALOG_ITEMS} fotos por importación.`}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isImporting}
            >
              Cancelar
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
