import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from 'react'
import { useToast } from '@/components/ui/useToast'
import { checkoutCart as checkoutCartAction } from '../actions/checkoutCart'
import type { Cart, CartLine, CheckoutResult } from '../types'
import type { Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'

const CART_KEY = 'alkachof.cart'

// The cart is entirely client-side: items are added, updated and removed
// without any backend call. localStorage keeps it alive across reloads.
// Only checkout talks to the server.
type StoredCart = Record<string, CartLine[]>

type CartState = {
  carts: Cart[]
  isMutating: boolean
  linesFor(catalogId: string): CartLine[]
  countFor(catalogId: string): number
  addItem(item: Item, quantity: number): Promise<void>
  setQuantity(catalogId: string, itemId: string, quantity: number): Promise<void>
  removeLine(catalogId: string, itemId: string): Promise<void>
  clearCart(catalogId: string): Promise<void>
  checkout(catalogId: string): Promise<CheckoutResult>
}

const CartContext = createContext<CartState | null>(null)

function readStoredCart(): StoredCart {
  try {
    const stored = localStorage.getItem(CART_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function writeStoredCart(cart: StoredCart): void {
  localStorage.setItem(CART_KEY, JSON.stringify(cart))
}

function storedCartToCarts(stored: StoredCart): Cart[] {
  return Object.entries(stored)
    .filter(([, items]) => items.length > 0)
    .map(([catalogId, items]) => ({
      id: catalogId,
      catalogId,
      items,
    }))
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [carts, setCarts] = useState<Cart[]>(() =>
    storedCartToCarts(readStoredCart())
  )
  const [isMutating, setIsMutating] = useState(false)
  const toast = useToast()

  const persist = useCallback((stored: StoredCart) => {
    writeStoredCart(stored)
    setCarts(storedCartToCarts(stored))
  }, [])

  const linesFor = useCallback(
    (catalogId: string): CartLine[] => {
      const cart = carts.find((c) => c.catalogId === catalogId)
      return cart?.items ?? []
    },
    [carts]
  )

  const countFor = useCallback(
    (catalogId: string): number => {
      const lines = linesFor(catalogId)
      return lines.reduce((sum, line) => sum + line.quantity, 0)
    },
    [linesFor]
  )

  const addItem = useCallback(
    async (item: Item, quantity: number) => {
      const stored = readStoredCart()
      const catalogLines = stored[item.catalogId] ?? []
      const existingIndex = catalogLines.findIndex(
        (line) => line.itemId === item._id
      )
      if (existingIndex >= 0) {
        catalogLines[existingIndex].quantity += quantity
      } else {
        catalogLines.push({
          itemId: item._id,
          quantity,
          name: item.name,
          price: item.price,
          imgPath: item.imgPath,
          stock: item.stock,
        })
      }
      stored[item.catalogId] = catalogLines
      persist(stored)
    },
    [persist]
  )

  const setQuantity = useCallback(
    async (catalogId: string, itemId: string, quantity: number) => {
      const stored = readStoredCart()
      const catalogLines = stored[catalogId] ?? []
      const index = catalogLines.findIndex((line) => line.itemId === itemId)
      if (index >= 0) {
        if (quantity <= 0) {
          catalogLines.splice(index, 1)
        } else {
          catalogLines[index].quantity = quantity
        }
      }
      stored[catalogId] = catalogLines
      persist(stored)
    },
    [persist]
  )

  const removeLine = useCallback(
    async (catalogId: string, itemId: string) => {
      const stored = readStoredCart()
      const catalogLines = stored[catalogId] ?? []
      const index = catalogLines.findIndex((line) => line.itemId === itemId)
      if (index >= 0) {
        catalogLines.splice(index, 1)
      }
      stored[catalogId] = catalogLines
      persist(stored)
    },
    [persist]
  )

  const clearCart = useCallback(
    async (catalogId: string) => {
      const stored = readStoredCart()
      delete stored[catalogId]
      persist(stored)
    },
    [persist]
  )

  const checkout = useCallback(
    async (catalogId: string): Promise<CheckoutResult> => {
      setIsMutating(true)
      try {
        const cart = carts.find((c) => c.catalogId === catalogId)
        if (!cart || cart.items.length === 0) {
          throw new Error('El carrito está vacío')
        }

        const result = await checkoutCartAction(catalogId, cart.items)

        const stored = readStoredCart()
        delete stored[catalogId]
        persist(stored)

        return result
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Error al procesar el pedido'
        toast.error(msg)
        throw err
      } finally {
        setIsMutating(false)
      }
    },
    [carts, persist, toast]
  )

  const value = useMemo<CartState>(
    () => ({
      carts,
      isMutating,
      linesFor,
      countFor,
      addItem,
      setQuantity,
      removeLine,
      clearCart,
      checkout,
    }),
    [carts, isMutating, linesFor, countFor, addItem, setQuantity, removeLine, clearCart, checkout]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartState {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
