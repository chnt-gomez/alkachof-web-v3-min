import { cn } from '@/lib/utils'
import { HOME_TABS, panelId, type HomeTab } from '../homeTabs'

type Props = {
  active: HomeTab
  onSelect: (tab: HomeTab) => void
}

/**
 * Segmented control splitting Home into the seller's own things and the buy
 * side. Styled as one switch — a muted track with the active half raised out of
 * it — matching the Pedidos role tabs, so both screens' halves read the same.
 */
export function HomeTabs({ active, onSelect }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Secciones de inicio"
      className="flex gap-1 rounded-full bg-muted p-1"
    >
      {HOME_TABS.map(({ value, label, activeClass }) => {
        const isActive = value === active
        return (
          <button
            key={value}
            role="tab"
            type="button"
            aria-selected={isActive}
            aria-controls={panelId(value)}
            onClick={() => onSelect(value)}
            className={cn(
              'flex-1 rounded-full py-1.5 text-sm font-medium transition-colors',
              isActive ? activeClass : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
