import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

type Props = { children: ReactNode }
type State = { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, info)
  }

  private handleReload = () => {
    window.location.assign('/')
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <main
        role="alert"
        className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center"
      >
        <h1 className="text-xl font-semibold">Algo salió mal</h1>
        <p className="text-sm text-muted-foreground">
          Ocurrió un error inesperado. Intenta recargar la página.
        </p>
        <Button onClick={this.handleReload}>Volver al inicio</Button>
      </main>
    )
  }
}
