import { CatalogHeroImage } from '@/components/CatalogImage'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'
import { resolveMediaUrl } from '@/lib/mediaUrl'
import { publicCatalogName } from '@/lib/catalogName'

/**
 * The seller's card as a visitor arriving from an invitation first sees it.
 * `CatalogHeroImage` carries the image, and the placeholder when the seller has
 * not set one — an invitation with an empty slot where the shop should be is
 * the worst first impression this page can make.
 */
export function InvitationCard({ catalog }: { catalog: Catalog }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border-2 border-ink bg-card p-5 text-foreground">
      <div className="flex flex-col gap-1">
        <h1 className="stamp stamp-mark text-2xl">{publicCatalogName(catalog.alias)}</h1>
        {catalog.welcomeText && (
          <p className="text-base text-foreground">{catalog.welcomeText}</p>
        )}
      </div>
      <CatalogHeroImage
        src={resolveMediaUrl(catalog.image)}
        alt={publicCatalogName(catalog.alias)}
      />
    </div>
  )
}
