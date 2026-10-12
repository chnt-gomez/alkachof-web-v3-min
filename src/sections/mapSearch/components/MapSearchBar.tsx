import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

type Props = {
  value: string
  onChange: (value: string) => void
  /** False until an endpoint can answer a search. See the caption below. */
  enabled: boolean
}

/**
 * The field is **present and inert**, and says so.
 *
 * An enabled input that accepts text and does nothing on Enter is the shape that
 * produces bug reports: the user cannot tell a missing feature from a broken one.
 * A visibly disabled control with a sentence next to it is legible.
 *
 * When it works it will search catalogs *within the current viewport* — the same
 * bounded query the rest of this screen is built around. Do not reword it as a
 * global name search; that promises a different endpoint than the one
 * `blueprint.LocationBasedSearch.md` §7 asks for.
 */
export function MapSearchBar({ value, onChange, enabled }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <Search
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={!enabled}
          aria-label="Buscar catálogos"
          placeholder="Buscar catálogos cerca de ti"
          className="pl-6"
        />
      </div>
      {!enabled && (
        <p className="text-xs text-muted-foreground">
          La búsqueda por nombre estará disponible muy pronto.
        </p>
      )}
    </div>
  )
}
