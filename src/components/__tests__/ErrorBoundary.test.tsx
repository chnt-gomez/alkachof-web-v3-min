import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from '../ErrorBoundary'

function Boom(): null {
  throw new Error('boom')
}

describe('ErrorBoundary', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    errorSpy.mockRestore()
  })

  it('renders children when no error is thrown', () => {
    render(
      <ErrorBoundary>
        <p>contenido</p>
      </ErrorBoundary>
    )
    expect(screen.getByText('contenido')).toBeInTheDocument()
  })

  it('renders Spanish fallback when a child throws', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    )
    expect(screen.getByRole('alert')).toHaveTextContent(/algo salió mal/i)
    expect(screen.getByRole('button', { name: /volver al inicio/i })).toBeInTheDocument()
  })
})
