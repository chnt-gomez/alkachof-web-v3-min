import { useState } from 'react'
import { Instagram, LoaderCircle, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  initialQuery: string
  isSearching: boolean
  onSearch: (query: string) => void
}

/**
 * Step 1 of enrollment: name the seller's own account.
 *
 * **This looks up an exact handle — it does not search by name.** Neither Apify
 * actor does fuzzy matching, so the copy asks for the username as Instagram
 * spells it rather than inviting a name the lookup would never resolve.
 *
 * The public-account requirement is stated up front rather than discovered a
 * screen later: a private account cannot be imported at all, and finding that
 * out after typing your handle reads as a bug.
 */
export function InstagramSearchForm({ initialQuery, isSearching, onSearch }: Props) {
  const [query, setQuery] = useState(initialQuery)

  return (
    <form
      className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-6 text-center"
      onSubmit={(e) => {
        e.preventDefault()
        onSearch(query)
      }}
    >
      <Instagram size={28} className="text-primary" />
      <p className="text-sm font-semibold">Escribe tu usuario de Instagram</p>
      <p className="text-sm text-muted-foreground">
        Escríbelo tal como aparece en tu perfil. Tu cuenta debe ser pública para poder
        importar tus fotos.
      </p>

      <div className="flex w-full items-center gap-2 rounded-xl border px-3 py-2">
        <span aria-hidden="true" className="text-sm text-muted-foreground">
          @
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={isSearching}
          placeholder="mi_negocio"
          aria-label="Usuario de Instagram"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
      </div>

      <Button type="submit" disabled={isSearching || query.trim() === ''}>
        {isSearching ? <LoaderCircle size={16} className="animate-spin" /> : <Search size={16} />}
        Buscar
      </Button>

      {/*
        A search runs a scraper job and takes seconds. A silent wait behind a
        button spinner reads as a frozen app, so the wait is named.
      */}
      {isSearching && (
        <p aria-live="polite" className="text-xs text-muted-foreground">
          Buscando en Instagram… esto puede tardar unos segundos.
        </p>
      )}
    </form>
  )
}
