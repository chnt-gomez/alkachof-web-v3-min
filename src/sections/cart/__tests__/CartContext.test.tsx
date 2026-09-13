import React, { useState } from 'react'
import { render, screen, act, waitFor } from '@testing-library/react'
import { useCart, CartProvider } from '../context/CartContext'
import { ToastProvider } from '@/components/ui/toast'
import type { Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'
import { vi } from 'vitest'

// Only the network call is stubbed — ServiceInCartError stays real, since the
// context branches on `instanceof` and a stand-in class would never match.
vi.mock('../actions/checkoutCart', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../actions/checkoutCart')>()),
  checkoutCart: vi.fn(() =>
    Promise.resolve({
      id: 'txn-123',
      status: 'confirmed',
      total: 5000,
    })
  ),
}))

import { checkoutCart, ServiceInCartError } from '../actions/checkoutCart'

const mockItem: Item = {
  _id: 'item-1',
  name: 'Test Product',
  price: 1500,
  imgPath: '/img.jpg',
  outOfStock: false,
  catalogId: 'catalog-1',
  description: 'A test product',
  updatedOn: new Date().toISOString(),
}

const mockItem2: Item = {
  _id: 'item-2',
  name: 'Another Product',
  price: 2000,
  imgPath: '/img2.jpg',
  outOfStock: false,
  catalogId: 'catalog-1',
  description: 'Another product',
  updatedOn: new Date().toISOString(),
}

const mockService: Item = {
  _id: 'item-3',
  name: 'Test Service',
  price: 0,
  imgPath: '/img3.jpg',
  outOfStock: false,
  catalogId: 'catalog-1',
  description: 'A test service',
  updatedOn: new Date().toISOString(),
  type: 'service',
}

function TestComponent() {
  const { carts, linesFor, countFor, addItem, setQuantity, removeLine, clearCart, checkout } =
    useCart()

  return (
    <div>
      <div data-testid="cart-count">{countFor('catalog-1')}</div>
      <div data-testid="cart-items">
        {linesFor('catalog-1').map((line) => (
          <div key={line.itemId} data-testid={`item-${line.itemId}`}>
            {line.name} x {line.quantity}
          </div>
        ))}
      </div>
      <button onClick={() => addItem(mockItem, 1)} data-testid="add-item">
        Add Item
      </button>
      <button onClick={() => addItem(mockItem2, 2)} data-testid="add-item-2">
        Add Item 2
      </button>
      <button onClick={() => addItem(mockService, 1)} data-testid="add-service">
        Add Service
      </button>
      <button onClick={() => setQuantity('catalog-1', 'item-1', 5)} data-testid="set-qty">
        Set Qty to 5
      </button>
      <button onClick={() => setQuantity('catalog-1', 'item-1', 0)} data-testid="set-qty-0">
        Set Qty to 0
      </button>
      <button onClick={() => removeLine('catalog-1', 'item-1')} data-testid="remove-item">
        Remove Item
      </button>
      <button onClick={() => clearCart('catalog-1')} data-testid="clear-cart">
        Clear Cart
      </button>
      {/* Swallow the rejection like CartDrawer does — checkout rethrows so the
          caller can react, and an uncaught one just noises up the test output. */}
      <button
        onClick={() => {
          void checkout('catalog-1').catch(() => {})
        }}
        data-testid="checkout"
      >
        Checkout
      </button>
      <div data-testid="total-carts">{carts.length}</div>
    </div>
  )
}

function renderWithProviders(component: React.ReactNode) {
  return render(
    <ToastProvider>
      <CartProvider>{component}</CartProvider>
    </ToastProvider>
  )
}

describe('CartContext', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('should initialize with empty cart', () => {
    renderWithProviders(<TestComponent />)

    expect(screen.getByTestId('cart-count')).toHaveTextContent('0')
    expect(screen.queryByTestId('item-item-1')).not.toBeInTheDocument()
  })

  it('should add an item to cart', async () => {
    renderWithProviders(<TestComponent />)

    const addBtn = screen.getByTestId('add-item')
    await act(async () => {
      addBtn.click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('cart-count')).toHaveTextContent('1')
      expect(screen.getByTestId('item-item-1')).toHaveTextContent('Test Product x 1')
    })
  })

  it('refuses to add a service — services are requested, not bought', async () => {
    renderWithProviders(<TestComponent />)

    await act(async () => {
      screen.getByTestId('add-service').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('cart-count')).toHaveTextContent('0')
    })
    expect(screen.queryByTestId('item-item-3')).not.toBeInTheDocument()
  })

  it('hides a service line left in storage from before services existed', async () => {
    localStorage.setItem(
      'alkachof.cart',
      JSON.stringify({
        'catalog-1': [
          { itemId: 'item-1', quantity: 1, name: 'Test Product', price: 1500, imgPath: '' },
          {
            itemId: 'item-3',
            quantity: 2,
            name: 'Test Service',
            price: 0,
            imgPath: '',
            type: 'service',
          },
        ],
      }),
    )

    renderWithProviders(<TestComponent />)

    // Only the product counts, and only the product is listed.
    expect(screen.getByTestId('cart-count')).toHaveTextContent('1')
    expect(screen.getByTestId('item-item-1')).toBeInTheDocument()
    expect(screen.queryByTestId('item-item-3')).not.toBeInTheDocument()
  })

  // A service added to the cart before the client tracked item types carries no
  // `type`, so the read-time filter can't spot it. The server's rejection names
  // it, which is the only way to repair such a cart.
  it('drops an untyped service line the server rejects, keeping the rest', async () => {
    localStorage.setItem(
      'alkachof.cart',
      JSON.stringify({
        'catalog-1': [
          { itemId: 'item-1', quantity: 1, name: 'Test Product', price: 1500, imgPath: '' },
          { itemId: 'legacy-service', quantity: 1, name: 'Old Service', price: 0, imgPath: '' },
        ],
      }),
    )
    vi.mocked(checkoutCart).mockRejectedValueOnce(
      new ServiceInCartError(
        'Service items cannot be purchased through checkout',
        'legacy-service',
      ),
    )

    renderWithProviders(<TestComponent />)

    // Both lines are visible up front — neither carries a type.
    expect(screen.getByTestId('cart-count')).toHaveTextContent('2')

    await act(async () => {
      screen.getByTestId('checkout').click()
    })

    // The refused line is gone; the product survives so a retry can succeed.
    await waitFor(() => {
      expect(screen.queryByTestId('item-legacy-service')).not.toBeInTheDocument()
    })
    expect(screen.getByTestId('item-item-1')).toBeInTheDocument()
    expect(screen.getByTestId('cart-count')).toHaveTextContent('1')
  })

  it('leaves the cart alone when the rejection names no item', async () => {
    localStorage.setItem(
      'alkachof.cart',
      JSON.stringify({
        'catalog-1': [
          { itemId: 'item-1', quantity: 1, name: 'Test Product', price: 1500, imgPath: '' },
        ],
      }),
    )
    vi.mocked(checkoutCart).mockRejectedValueOnce(
      new ServiceInCartError('Service items cannot be purchased through checkout', null),
    )

    renderWithProviders(<TestComponent />)

    await act(async () => {
      screen.getByTestId('checkout').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('cart-count')).toHaveTextContent('1')
    })
  })

  it('never sends a stale service line to checkout', async () => {
    localStorage.setItem(
      'alkachof.cart',
      JSON.stringify({
        'catalog-1': [
          { itemId: 'item-1', quantity: 1, name: 'Test Product', price: 1500, imgPath: '' },
          {
            itemId: 'item-3',
            quantity: 2,
            name: 'Test Service',
            price: 0,
            imgPath: '',
            type: 'service',
          },
        ],
      }),
    )

    renderWithProviders(<TestComponent />)

    await act(async () => {
      screen.getByTestId('checkout').click()
    })

    await waitFor(() => expect(checkoutCart).toHaveBeenCalled())
    const [, lines] = vi.mocked(checkoutCart).mock.calls[0]
    expect(lines.map((l) => l.itemId)).toEqual(['item-1'])
  })

  it('should increment quantity when adding same item twice', async () => {
    renderWithProviders(<TestComponent />)

    const addBtn = screen.getByTestId('add-item')

    await act(async () => {
      addBtn.click()
      addBtn.click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('cart-count')).toHaveTextContent('2')
      expect(screen.getByTestId('item-item-1')).toHaveTextContent('Test Product x 2')
    })
  })

  it('should add multiple different items', async () => {
    renderWithProviders(<TestComponent />)

    const addBtn1 = screen.getByTestId('add-item')
    const addBtn2 = screen.getByTestId('add-item-2')

    await act(async () => {
      addBtn1.click()
      addBtn2.click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('cart-count')).toHaveTextContent('3')
      expect(screen.getByTestId('item-item-1')).toHaveTextContent('Test Product x 1')
      expect(screen.getByTestId('item-item-2')).toHaveTextContent('Another Product x 2')
    })
  })

  it('should update quantity', async () => {
    renderWithProviders(<TestComponent />)

    const addBtn = screen.getByTestId('add-item')
    const setQtyBtn = screen.getByTestId('set-qty')

    await act(async () => {
      addBtn.click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('cart-count')).toHaveTextContent('1')
    })

    await act(async () => {
      setQtyBtn.click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('cart-count')).toHaveTextContent('5')
      expect(screen.getByTestId('item-item-1')).toHaveTextContent('Test Product x 5')
    })
  })

  it('should remove item when quantity set to 0', async () => {
    renderWithProviders(<TestComponent />)

    const addBtn = screen.getByTestId('add-item')

    await act(async () => {
      addBtn.click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('cart-count')).toHaveTextContent('1')
    })

    await act(async () => {
      screen.getByTestId('set-qty-0').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('cart-count')).toHaveTextContent('0')
      expect(screen.queryByTestId('item-item-1')).not.toBeInTheDocument()
    })
  })

  it('should remove line item', async () => {
    renderWithProviders(<TestComponent />)

    const addBtn = screen.getByTestId('add-item')
    const removeBtn = screen.getByTestId('remove-item')

    await act(async () => {
      addBtn.click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('cart-count')).toHaveTextContent('1')
    })

    await act(async () => {
      removeBtn.click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('cart-count')).toHaveTextContent('0')
      expect(screen.queryByTestId('item-item-1')).not.toBeInTheDocument()
    })
  })

  it('should clear entire cart', async () => {
    renderWithProviders(<TestComponent />)

    const addBtn1 = screen.getByTestId('add-item')
    const addBtn2 = screen.getByTestId('add-item-2')
    const clearBtn = screen.getByTestId('clear-cart')

    await act(async () => {
      addBtn1.click()
      addBtn2.click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('cart-count')).toHaveTextContent('3')
    })

    await act(async () => {
      clearBtn.click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('cart-count')).toHaveTextContent('0')
      expect(screen.queryByTestId('item-item-1')).not.toBeInTheDocument()
      expect(screen.queryByTestId('item-item-2')).not.toBeInTheDocument()
    })
  })

  it('should persist cart to localStorage', async () => {
    const { unmount } = renderWithProviders(<TestComponent />)

    const addBtn = screen.getByTestId('add-item')

    await act(async () => {
      addBtn.click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('cart-count')).toHaveTextContent('1')
    })

    const stored = JSON.parse(localStorage.getItem('alkachof.cart') || '{}')
    expect(stored['catalog-1']).toBeDefined()
    expect(stored['catalog-1'][0]).toMatchObject({
      itemId: 'item-1',
      quantity: 1,
      name: 'Test Product',
    })

    unmount()

    // Re-render and verify cart is restored
    renderWithProviders(<TestComponent />)

    await waitFor(() => {
      expect(screen.getByTestId('cart-count')).toHaveTextContent('1')
      expect(screen.getByTestId('item-item-1')).toHaveTextContent('Test Product x 1')
    })
  })

  it('should support multiple catalogs', async () => {
    function MultiCatalogComponent() {
      const { countFor, addItem } = useCart()
      const mockItemCatalog2: Item = { ...mockItem, catalogId: 'catalog-2' }

      return (
        <div>
          <div data-testid="count-1">{countFor('catalog-1')}</div>
          <div data-testid="count-2">{countFor('catalog-2')}</div>
          <button
            onClick={() => addItem(mockItem, 1)}
            data-testid="add-to-cat-1"
          >
            Add to Cat 1
          </button>
          <button
            onClick={() => addItem(mockItemCatalog2, 1)}
            data-testid="add-to-cat-2"
          >
            Add to Cat 2
          </button>
        </div>
      )
    }

    renderWithProviders(<MultiCatalogComponent />)

    const addBtn1 = screen.getByTestId('add-to-cat-1')
    const addBtn2 = screen.getByTestId('add-to-cat-2')

    await act(async () => {
      addBtn1.click()
      addBtn1.click()
      addBtn2.click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('count-1')).toHaveTextContent('2')
      expect(screen.getByTestId('count-2')).toHaveTextContent('1')
    })
  })

  it('should reject checkout with empty cart', async () => {
    function CheckoutTestComponent() {
      const { checkout } = useCart()
      const [error, setError] = useState<string | null>(null)

      const handleCheckout = async () => {
        try {
          await checkout('catalog-1')
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Unknown error')
        }
      }

      return (
        <div>
          <button onClick={handleCheckout} data-testid="checkout-empty">
            Checkout Empty
          </button>
          {error && <div data-testid="error-msg">{error}</div>}
        </div>
      )
    }

    renderWithProviders(<CheckoutTestComponent />)

    const checkoutBtn = screen.getByTestId('checkout-empty')

    await act(async () => {
      checkoutBtn.click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('error-msg')).toHaveTextContent('El carrito está vacío')
    })
  })
})
