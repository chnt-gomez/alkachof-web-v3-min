import { ShoppingCart } from 'lucide-react'
import { useCart } from '../context/CartContext'

type Props = {
  catalogId: string
  onClick: () => void
}

export function CartBookTag({ catalogId, onClick }: Props) {
  const { countFor } = useCart()
  const count = countFor(catalogId)

  return (
    <div className="pointer-events-none fixed inset-x-0 top-1/3 z-40 mx-auto max-w-md">
    <button
      onClick={onClick}
      className="pointer-events-auto absolute right-0 flex items-center gap-1.5 rounded-l-xl border-2 border-r-0 border-ink bg-buy py-2.5 pl-3 pr-2 text-buy-ink transition-[background-color] press-ink"
      aria-label={`Ver carrito (${count} ${count === 1 ? 'artículo' : 'artículos'})`}
    >
      <ShoppingCart size={20} />
      {count > 0 && (
        <span className="numeral flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-ink bg-destructive px-1 text-xs text-destructive-foreground">
          {Math.min(count, 99)}
        </span>
      )}
    </button>
    </div>
  )
}
