import { act, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AboutPage } from '../AboutPage'
import { WordRandomizer } from '../components/WordRandomizer'

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/about']}>
      <Routes>
        <Route path="/about" element={<AboutPage />} />
        <Route path="/login" element={<div>Iniciar sesión — pantalla</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AboutPage', () => {
  it('renders the welcome heading', () => {
    renderPage()
    expect(screen.getByText('Bienvenido a Alkachof')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  it('links the primary call to action to the login page', () => {
    renderPage()
    const cta = screen.getByRole('link', { name: 'Iniciar sesión' })
    expect(cta).toHaveAttribute('href', '/login')
  })
})

describe('WordRandomizer', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('advances to the next word after the interval elapses', () => {
    vi.useFakeTimers()
    render(<WordRandomizer words={['uno', 'dos']} intervalMs={500} />)

    expect(screen.getByText('uno')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(screen.getByText('dos')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(screen.getByText('uno')).toBeInTheDocument()
  })

  it('does not start a timer for a single word', () => {
    vi.useFakeTimers()
    render(<WordRandomizer words={['solo']} intervalMs={500} />)

    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.getByText('solo')).toBeInTheDocument()
  })
})
