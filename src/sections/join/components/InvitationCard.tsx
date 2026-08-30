import { CatalogHeroImage } from '@/components/CatalogImage'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'
import { resolveMediaUrl } from '@/lib/mediaUrl'

/**
 * The gradient is not decoration: `CatalogHeroImage`'s placeholder branch uses
 * `primary-foreground` tones that are only legible on a `primary` background.
 */
export function InvitationCard({ catalog }: { catalog: Catalog }) {
  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-gradient-to-br from-primary to-primary-deep p-6 text-primary-foreground shadow-lg shadow-primary/20">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold leading-tight">{catalog.alias}</h1>
        {catalog.welcomeText && (
          <p className="text-base text-primary-foreground/80">{catalog.welcomeText}</p>
        )}
      </div>
      <CatalogHeroImage src={resolveMediaUrl(catalog.image)} alt={catalog.alias} />
    </div>
  )
}
