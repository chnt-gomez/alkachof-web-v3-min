import { Link } from 'react-router-dom'
import { ChevronRight, PackagePlus, Store } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'

type Props = {
  catalog: Catalog
  hasProducts: boolean
}

export function MyCatalogCard({ catalog, hasProducts }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <Link
        to="/catalog"
        className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm transition-[box-shadow,transform] hover:shadow-md active:scale-[0.98]"
        aria-label={`Abrir mi catálogo ${catalog.alias}`}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
          <Store size={20} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-base font-semibold">{catalog.alias}</span>
          {catalog.description && (
            <span className="line-clamp-2 text-sm text-muted-foreground">{catalog.description}</span>
          )}
        </span>
        <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
      </Link>

      {!hasProducts && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <PackagePlus size={26} />
          </span>
          <h3 className="text-base font-semibold">Empieza a vender en Alkachof</h3>
          <p className="text-sm text-muted-foreground">
            Agrega tu primer producto para que tus clientes lo descubran.
          </p>
          <Button asChild>
            <Link to="/catalog">Agregar productos</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
