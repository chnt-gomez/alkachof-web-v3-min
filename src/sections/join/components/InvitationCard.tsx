import { CatalogHeroImage } from '@/components/CatalogImage'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'
import { resolveMediaUrl } from '@/lib/mediaUrl'

/**
 * The gradient is not decoration: `CatalogHeroImage`'s placeholder branch uses
 * card-stock tones: this card is flat paper, not a saturated panel.
 */
export function InvitationCard({ catalog }: { catalog: Catalog }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border-2 border-ink bg-card p-5 text-foreground">
      <div className="flex flex-col gap-1">
        <h1 className="stamp stamp-mark text-2xl">{catalog.alias}</h1>
        {catalog.welcomeText && (
          <p className="text-base text-foreground">{catalog.welcomeText}</p>
        )}
      </div>
      <CatalogHeroImage src={resolveMediaUrl(catalog.image)} alt={catalog.alias} />
    </div>
  )
}
