import { SearchX } from 'lucide-react'

export function CatalogNotFound() {
  return (
    <div role="alert" className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
        <SearchX size={26} />
      </span>
      <h1 className="text-2xl font-semibold">Catálogo no encontrado</h1>
      <p className="text-sm text-muted-foreground">
        El catálogo que buscas no existe o ya no está disponible.
      </p>
    </div>
  )
}
