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

  /**
   * This page is served at both `/` and `/about`, and is the only page a
   * non-JavaScript crawler ever reads in full (it is what the build
   * prerenders). The assertions below pin the parts that exist for that reader
   * rather than for a person — they look removable, and removing them is
   * invisible until weeks later in a search index.
   */
  it('answers "what is Alkachof?" in plain prose a crawler can quote', () => {
    renderPage()
    expect(
      screen.getByText(/catálogo digital gratuito para vendedores pequeños en México/i),
    ).toBeInTheDocument()
  })

  it('declares / as canonical from both urls, so the two are one page', () => {
    renderPage()
    expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://app.alkachof.mx/',
    )
  })

  it('publishes the FAQ as structured data matching the visible questions', () => {
    renderPage()

    const script = document.querySelector('script[type="application/ld+json"]')
    expect(script).not.toBeNull()

    const data = JSON.parse(script!.textContent ?? '{}')
    expect(data['@type']).toBe('FAQPage')
    expect(data.mainEntity.length).toBeGreaterThan(0)

    // Structured data that does not match the visible page is a policy
    // violation, so every question in the payload must be on screen.
    for (const entry of data.mainEntity) {
      expect(screen.getByText(entry.name)).toBeInTheDocument()
    }
  })
})

describe('WordRandomizer', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  /**
   * The component picks each word at random — on mount and again on every tick —
   * so `Math.random` has to be driven for the sequence to be deterministic.
   * Values map to an index via `Math.floor(r * words.length)`.
   */
  function stubWordPicks(...values: number[]) {
    const random = vi.spyOn(Math, 'random')
    for (const v of values) random.mockReturnValueOnce(v)
    // Anything past the scripted picks stays on the first word.
    random.mockReturnValue(0)
  }

  it('shows a different word after the interval elapses', () => {
    vi.useFakeTimers()
    // mount → 'uno', first tick → 'dos', second tick → 'uno'
    stubWordPicks(0, 0.9, 0)
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

  it('only ever renders words from the given list', () => {
    vi.useFakeTimers()
    const { container } = render(<WordRandomizer words={['uno', 'dos', 'tres']} intervalMs={500} />)

    // Unstubbed on purpose: whatever the real RNG picks must stay in range.
    for (let i = 0; i < 20; i++) {
      act(() => {
        vi.advanceTimersByTime(500)
      })
      expect(['uno', 'dos', 'tres']).toContain(container.textContent)
    }
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
