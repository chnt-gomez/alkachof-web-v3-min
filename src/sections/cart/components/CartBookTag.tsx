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
    <button
      onClick={onClick}
      className="fixed right-0 top-1/3 z-40 flex items-center gap-1.5 rounded-l-xl bg-primary py-2.5 pl-3 pr-2 text-primary-foreground shadow-lg transition-transform active:scale-95"
      aria-label={`Ver carrito (${count} ${count === 1 ? 'artículo' : 'artículos'})`}
    >
      <ShoppingCart size={20} />
      {count > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-xs font-bold text-destructive-foreground">
          {Math.min(count, 99)}
        </span>
      )}
    </button>
  )
}
