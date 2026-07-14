import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CartPage } from '../CartPage'
import { useCart } from '../context/CartContext'

vi.mock('../actions/fetchCarts')
vi.mock('../context/CartContext', async () => {
  const actual = await vi.importActual('../context/CartContext')
  return {
    ...actual,
    useCart: vi.fn(),
  }
})
vi.mock('@/sections/publicCatalog/actions/fetchPublicCatalog')
vi.mock('@/sections/publicCatalog/actions/fetchCatalogItems')

describe('CartPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows empty state when cart is empty', () => {
    vi.mocked(useCart).mockReturnValue({
      carts: [],
      isMutating: false,
      linesFor: () => [],
      countFor: () => 0,
      addItem: vi.fn(),
      setQuantity: vi.fn(),
      removeLine: vi.fn(),
      clearCart: vi.fn(),
      checkout: vi.fn(),
    })

    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    )

    expect(screen.getByText('Tu carrito está vacío')).toBeInTheDocument()
  })

  it('renders heading for carts', () => {
    vi.mocked(useCart).mockReturnValue({
      carts: [],
      isMutating: false,
      linesFor: () => [],
      countFor: () => 0,
      addItem: vi.fn(),
      setQuantity: vi.fn(),
      removeLine: vi.fn(),
      clearCart: vi.fn(),
      checkout: vi.fn(),
    })

    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    )

    expect(screen.getByText('Tu carrito está vacío')).toBeInTheDocument()
  })
})
