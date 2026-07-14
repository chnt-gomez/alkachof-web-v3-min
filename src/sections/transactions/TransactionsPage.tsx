import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTransactions } from './hooks/useTransactions'
import { TransactionList } from './components/TransactionList'
import { StatusFilterChips } from './components/StatusFilterChips'
import { TransactionDetailDialog } from './components/TransactionDetailDialog'
import type { TransactionRole, TransactionSummary } from './types'

const ROLE_TABS: { value: TransactionRole; label: string }[] = [
  { value: 'buyer', label: 'Compras' },
  { value: 'seller', label: 'Ventas' },
]

export function TransactionsPage() {
  const {
    role,
    setRole,
    statusFilter,
    setStatusFilter,
    status,
    transactions,
    hasMore,
    loadingMore,
    loadMore,
    reload,
  } = useTransactions()
  const [selected, setSelected] = useState<TransactionSummary | null>(null)

  return (
    <div className="flex flex-col gap-4 p-5">
      <h1 className="text-2xl font-bold tracking-tight">Pedidos</h1>

      <div role="tablist" aria-label="Tipo de pedido" className="flex gap-1 rounded-full bg-muted p-1">
        {ROLE_TABS.map((tab) => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={role === tab.value}
            onClick={() => setRole(tab.value)}
            className={cn(
              'flex-1 rounded-full py-1.5 text-sm font-medium transition-colors',
              role === tab.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <StatusFilterChips value={statusFilter} onChange={setStatusFilter} />

      {status === 'loading' && <ListSkeleton />}
      {status === 'error' && <ListError onRetry={reload} />}
      {status === 'ready' &&
        (transactions.length === 0 ? (
          <EmptyState role={role} />
        ) : (
          <>
            <TransactionList transactions={transactions} onSelect={setSelected} />
            {hasMore && (
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full"
              >
                {loadingMore ? 'Cargando...' : 'Cargar más'}
              </Button>
            )}
          </>
        ))}

      {selected && (
        <TransactionDetailDialog transaction={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Cargando pedidos">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
      ))}
    </div>
  )
}

function ListError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-4"
    >
      <p className="text-sm text-destructive">No pudimos cargar tus pedidos.</p>
      <Button size="sm" variant="outline" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  )
}

function EmptyState({ role }: { role: TransactionRole }) {
  return (
    <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
      {role === 'buyer'
        ? 'Aún no has realizado compras.'
        : 'Aún no has recibido ventas.'}
    </p>
  )
}
