import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'
import { ApiError } from '@/lib/api'
import { BrandMark } from '@/components/BrandMark'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/useToast'
import { useAuth } from '@/sections/auth/useAuth'
import { fetchPublicCatalog, type Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'
import { useCatalogSubscription } from '@/sections/publicCatalog/hooks/useCatalogSubscription'
import { CatalogNotFound } from '@/sections/publicCatalog/components/CatalogNotFound'
import { InvitationCard } from './components/InvitationCard'

function JoinFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-secondary via-background to-background px-5 py-10">
      <header className="flex justify-center">
        <BrandMark size="lg" />
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 py-10">
        {children}
      </main>
    </div>
  )
}

function InvalidInvitation() {
  return (
    <JoinFrame>
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-2xl font-semibold">Esta invitación no es válida.</h1>
        <Link to="/about" className="font-medium text-primary underline-offset-4 hover:underline">
          Conoce Alkachof
        </Link>
      </div>
    </JoinFrame>
  )
}

export function JoinPage() {
  const [searchParams] = useSearchParams()
  const catalogId = searchParams.get('catalogId')
  const productId = searchParams.get('product')
  const navigate = useNavigate()
  const toast = useToast()
  const { isAuthenticated, profile } = useAuth()

  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(catalogId))
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!catalogId) return
    setIsLoading(true)
    setError(null)
    setNotFound(false)
    fetchPublicCatalog(catalogId)
      .then(setCatalog)
      .catch((err: Error) => {
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true)
          return
        }
        setError(err.message)
      })
      .finally(() => setIsLoading(false))
  }, [catalogId])

  const isOwner = Boolean(catalog && profile && catalog.userId === profile.userId)
  const { isSubscribed, isLoading: isSubLoading, isPending: isSubPending, toggle } =
    useCatalogSubscription(catalog?._id, isAuthenticated && !isOwner)

  if (!catalogId) {
    return <InvalidInvitation />
  }

  if (isLoading) {
    return (
      <JoinFrame>
        <div className="flex flex-col items-center gap-3" aria-busy="true">
          <LoaderCircle size={28} className="animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando invitación…</p>
        </div>
      </JoinFrame>
    )
  }

  if (notFound) {
    return (
      <JoinFrame>
        <CatalogNotFound />
      </JoinFrame>
    )
  }

  if (error) {
    return (
      <JoinFrame>
        <p className="text-center text-sm text-destructive">{error}</p>
      </JoinFrame>
    )
  }

  if (!catalog) return null

  async function handleSubscribe() {
    try {
      await toggle()
      toast.success('¡Listo! Te suscribiste y recibirás sus novedades.')
      navigate(catalogHref)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo completar la acción.')
    }
  }

  const catalogHref = productId
    ? `/catalog/${catalogId}?product=${encodeURIComponent(productId)}`
    : `/catalog/${catalogId}`
  const isCheckingSubscription = isAuthenticated && !isOwner && isSubLoading
  const canSubscribe = isAuthenticated && !isOwner && !isSubLoading && !isSubscribed

  return (
    <JoinFrame>
      <InvitationCard catalog={catalog} />
      <p className="text-center text-base text-foreground">
        {catalog.alias} te quiere invitar a Alkachof para que veas su catálogo de productos y
        servicios
      </p>

      {canSubscribe ? (
        <Button size="lg" onClick={handleSubscribe} disabled={isSubPending} aria-busy={isSubPending}>
          {isSubPending ? 'Suscribiendo…' : 'Suscribirme'}
        </Button>
      ) : isCheckingSubscription ? (
        // Real navigation is withheld until we know whether to offer
        // Suscribirme instead — a plain disabled button, not a disabled Link
        // (anchors ignore the `disabled` attribute and stay clickable).
        <Button size="lg" disabled aria-busy="true">
          Ver catálogo
        </Button>
      ) : (
        <Button asChild size="lg">
          <Link to={catalogHref}>Ver catálogo</Link>
        </Button>
      )}

      {!isAuthenticated && (
        <p className="text-center text-sm text-muted-foreground">
          ¿Aún no tienes cuenta?{' '}
          <Link to="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
            Crea una
          </Link>
        </p>
      )}
    </JoinFrame>
  )
}
