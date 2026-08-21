/**
 * Tab identity for the split Home screen. Kept out of the component file so
 * HomeTabs.tsx only exports components (fast-refresh friendly).
 */
export type HomeTab = 'mis-cosas' | 'comprar'

/**
 * Seller side on the left in the app's green, buy side on the right in the buy
 * signature color — the same pairing the Pedidos role tabs use.
 */
export const HOME_TABS: Array<{ value: HomeTab; label: string; activeClass: string }> = [
  {
    value: 'mis-cosas',
    label: 'Mis cosas',
    activeClass: 'bg-primary text-primary-foreground shadow-sm',
  },
  { value: 'comprar', label: 'Comprar', activeClass: 'bg-buy text-buy-ink shadow-sm' },
]

/** Panel id for a tab, shared by the tab's aria-controls and the panel itself. */
export function panelId(tab: HomeTab): string {
  return `home-panel-${tab}`
}

/** Narrows the `?tab=` search param to a known tab, defaulting to Mis cosas. */
export function readTab(value: string | null): HomeTab {
  return value === 'comprar' ? 'comprar' : 'mis-cosas'
}
