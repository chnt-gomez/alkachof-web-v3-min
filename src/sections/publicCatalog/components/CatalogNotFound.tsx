export function CatalogNotFound() {
  return (
    <div role="alert" className="flex flex-col items-center gap-2 py-12 text-center">
      <h1 className="text-2xl font-semibold">Catálogo no encontrado</h1>
      <p className="text-sm text-muted-foreground">
        El catálogo que buscas no existe o ya no está disponible.
      </p>
    </div>
  )
}
