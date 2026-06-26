import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { NotFoundPage } from '../NotFoundPage'

describe('NotFoundPage', () => {
  it('renders 404 copy and a link back home', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    )
    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /no encontrada/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /volver al inicio/i })).toHaveAttribute('href', '/')
  })
})
