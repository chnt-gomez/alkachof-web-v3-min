import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from 'react'
import { useAuth } from '@/sections/auth/useAuth'
import { fetchCarts } from '../actions/fetchCarts'
import { addToCart as addToCartAction } from '../actions/addToCart'
import { removeFromCart as removeFromCartAction } from '../actions/removeFromCart'
import { deleteCart as deleteCartAction } from '../actions/deleteCart'
import { checkoutCart as checkoutCartAction } from '../actions/checkoutCart'
import { useToast } from '@/components/ui/useToast'
import type { Cart, CartLine, CheckoutResult } from '../types'
import type { Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'

const GUEST_CART_KEY = 'alkachof.guestCart'

type GuestCart = Record<string, CartLine[]>

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

function getGuestCart(): GuestCart {
  try {
    const stored = localStorage.getItem(GUEST_CART_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function setGuestCart(cart: GuestCart): void {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart))
}

function clearGuestCart(): void {
  localStorage.removeItem(GUEST_CART_KEY)
}

function guestCartToCarts(guestCart: GuestCart): Cart[] {
  return Object.entries(guestCart).map(([catalogId, items]) => ({
    id: catalogId,
    ownerId: 'guest',
    catalogId,
    items,
    discountCodeApplied: null,
  }))
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [carts, setCarts] = useState<Cart[]>([])
  const [isMutating, setIsMutating] = useState(false)
  const toast = useToast()

  const isGuest = !isAuthenticated

  useEffect(() => {
    if (isGuest) {
      const guestCart = getGuestCart()
      setCarts(guestCartToCarts(guestCart))
    } else {
      fetchCarts()
        .then(setCarts)
        .catch((err) => {
          const msg = err instanceof Error ? err.message : 'Error al cargar carrito'
          toast.error(msg)
        })
    }
  }, [isAuthenticated, isGuest, toast])

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
      setIsMutating(true)
      try {
        if (isGuest) {
          const guestCart = getGuestCart()
          const catalogLines = guestCart[item.catalogId] ?? []
          const existingIndex = catalogLines.findIndex(
            (line) => line.itemId === item._id
          )
          if (existingIndex >= 0) {
            catalogLines[existingIndex].quantity += quantity
          } else {
            catalogLines.push({ itemId: item._id, quantity })
          }
          guestCart[item.catalogId] = catalogLines
          setGuestCart(guestCart)
          setCarts(guestCartToCarts(guestCart))
        } else {
          const updatedCart = await addToCartAction(item._id, quantity)
          setCarts((prev) =>
            prev.map((c) => (c.id === updatedCart.id ? updatedCart : c))
          )
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al agregar al carrito'
        toast.error(msg)
        throw err
      } finally {
        setIsMutating(false)
      }
    },
    [isGuest, toast]
  )

  const setQuantity = useCallback(
    async (catalogId: string, itemId: string, quantity: number) => {
      setIsMutating(true)
      try {
        if (isGuest) {
          const guestCart = getGuestCart()
          const catalogLines = guestCart[catalogId] ?? []
          const index = catalogLines.findIndex((line) => line.itemId === itemId)
          if (index >= 0) {
            if (quantity <= 0) {
              catalogLines.splice(index, 1)
            } else {
              catalogLines[index].quantity = quantity
            }
          }
          guestCart[catalogId] = catalogLines
          setGuestCart(guestCart)
          setCarts(guestCartToCarts(guestCart))
        } else {
          const cart = carts.find((c) => c.catalogId === catalogId)
          if (!cart) throw new Error('Cart not found')

          const lineIndex = cart.items.findIndex((item) => item.itemId === itemId)
          if (lineIndex < 0) throw new Error('Line not found')

          if (quantity <= 0) {
            await removeFromCartAction(cart.id, itemId)
          } else {
            const currentQty = cart.items[lineIndex].quantity
            if (currentQty < quantity) {
              const delta = quantity - currentQty
              await addToCartAction(itemId, delta)
            } else if (currentQty > quantity) {
              await removeFromCartAction(cart.id, itemId)
              if (quantity > 0) {
                await addToCartAction(itemId, quantity)
              }
            }
          }

          const updatedCarts = await fetchCarts()
          setCarts(updatedCarts)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al actualizar cantidad'
        toast.error(msg)
        throw err
      } finally {
        setIsMutating(false)
      }
    },
    [carts, isGuest, toast]
  )

  const removeLine = useCallback(
    async (catalogId: string, itemId: string) => {
      setIsMutating(true)
      try {
        if (isGuest) {
          const guestCart = getGuestCart()
          const catalogLines = guestCart[catalogId] ?? []
          const index = catalogLines.findIndex((line) => line.itemId === itemId)
          if (index >= 0) {
            catalogLines.splice(index, 1)
          }
          guestCart[catalogId] = catalogLines
          setGuestCart(guestCart)
          setCarts(guestCartToCarts(guestCart))
        } else {
          const cart = carts.find((c) => c.catalogId === catalogId)
          if (!cart) throw new Error('Cart not found')
          await removeFromCartAction(cart.id, itemId)
          const updatedCarts = await fetchCarts()
          setCarts(updatedCarts)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al eliminar producto'
        toast.error(msg)
        throw err
      } finally {
        setIsMutating(false)
      }
    },
    [carts, isGuest, toast]
  )

  const clearCart = useCallback(
    async (catalogId: string) => {
      setIsMutating(true)
      try {
        if (isGuest) {
          const guestCart = getGuestCart()
          delete guestCart[catalogId]
          setGuestCart(guestCart)
          setCarts(guestCartToCarts(guestCart))
        } else {
          const cart = carts.find((c) => c.catalogId === catalogId)
          if (!cart) throw new Error('Cart not found')
          await deleteCartAction(cart.id)
          const updatedCarts = await fetchCarts()
          setCarts(updatedCarts)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al vaciar carrito'
        toast.error(msg)
        throw err
      } finally {
        setIsMutating(false)
      }
    },
    [carts, isGuest, toast]
  )

  const checkout = useCallback(
    async (catalogId: string): Promise<CheckoutResult> => {
      if (isGuest) throw new Error('Debe iniciar sesión para completar su pedido')

      setIsMutating(true)
      try {
        const cart = carts.find((c) => c.catalogId === catalogId)
        if (!cart) throw new Error('Cart not found')

        const result = await checkoutCartAction(cart.id)
        const updatedCarts = await fetchCarts()
        setCarts(updatedCarts)
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
    [carts, isGuest, toast]
  )

  useEffect(() => {
    if (!isGuest) {
      const guestCart = getGuestCart()
      if (Object.keys(guestCart).length > 0) {
        setIsMutating(true)
        const replayCart = async () => {
          try {
            for (const lines of Object.values(guestCart)) {
              for (const line of lines) {
                await addToCartAction(line.itemId, line.quantity)
              }
            }
            clearGuestCart()
            const updatedCarts = await fetchCarts()
            setCarts(updatedCarts)
            toast.success('Tu carrito ha sido sincronizado')
          } catch (err) {
            const msg =
              err instanceof Error
                ? err.message
                : 'No se pudo sincronizar el carrito'
            toast.error(msg)
          } finally {
            setIsMutating(false)
          }
        }
        replayCart()
      }
    }
  }, [isGuest, toast])

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
