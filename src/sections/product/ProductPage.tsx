import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Pencil, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { fetchItem } from '@/sections/catalog/actions/fetchItem'
import { updateItem } from '@/sections/catalog/actions/updateItem'
import { deleteItem } from '@/sections/catalog/actions/deleteItem'
import { ItemFormDialog } from '@/sections/catalog/components/ItemFormDialog'
import { DeleteItemConfirm } from '@/sections/catalog/components/DeleteItemConfirm'
import type { Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

export function ProductPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [item, setItem] = useState<Item | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!id) return
    setIsLoading(true)
    setError(null)
    fetchItem(id)
      .then(setItem)
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false))
  }, [id])

  const backLink = item ? `/edit/catalog/${item.catalogId}` : '/'

  return (
    <main className="flex min-h-screen flex-col gap-4 p-4">
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link to={backLink}>← Volver</Link>
      </Button>

      {isLoading && (
        <p aria-busy="true" className="p-4 text-sm text-muted-foreground">Cargando producto…</p>
      )}

      {error && !isLoading && (
        <p role="alert" className="p-4 text-sm text-destructive">{error}</p>
      )}

      {item && !isLoading && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{item.name || 'Producto sin nombre'}</CardTitle>
              {item.description && <CardDescription>{item.description}</CardDescription>}
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {item.imgPath ? (
                <div className="flex w-full items-center justify-center overflow-hidden rounded-lg bg-muted">
                  <img src={item.imgPath} alt={item.name || 'Producto'} className="w-full object-contain" />
                </div>
              ) : (
                <div className="flex h-32 w-full items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
                  Sin imagen
                </div>
              )}
              {item.price > 0 && <p className="text-xl font-bold">{formatPrice(item.price)}</p>}
              {item.stock === 0 && <p className="text-sm text-destructive">Sin existencias</p>}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setEditing(true)}>
              <Pencil size={14} className="mr-1.5" />
              Editar
            </Button>
            <Button variant="destructive" className="flex-1" onClick={() => setDeleting(true)}>
              <Trash2 size={14} className="mr-1.5" />
              Eliminar
            </Button>
          </div>
        </>
      )}

      {editing && item && (
        <ItemFormDialog
          mode="edit"
          initial={item}
          onSubmit={async (payload) => {
            const updated = await updateItem(item._id, payload)
            setItem(updated)
          }}
          onClose={() => setEditing(false)}
        />
      )}

      {deleting && item && (
        <DeleteItemConfirm
          itemName={item.name}
          onConfirm={async () => {
            await deleteItem(item._id)
            navigate(`/edit/catalog/${item.catalogId}`, { replace: true })
          }}
          onClose={() => setDeleting(false)}
        />
      )}
    </main>
  )
}
