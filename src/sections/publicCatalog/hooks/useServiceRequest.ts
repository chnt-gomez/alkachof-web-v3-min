import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '@/lib/api'
import { withMinDuration } from '@/lib/pendingAction'
import { useAuth } from '@/sections/auth/useAuth'
import { createRequest } from '@/sections/requests/actions/createRequest'
import type { Item } from '../actions/fetchCatalogItems'

export type RequestOutcome =
  | { kind: 'needs-auth' }
  | { kind: 'sent' }
  | { kind: 'error'; message: string }

/** Maps the API's create errors to something a buyer can act on. */
function messageFor(err: unknown): string {
  if (err instanceof ApiError) {
    if (/cannot request your own service/i.test(err.message)) {
      return 'Este servicio es tuyo, no puedes solicitarlo.'
    }
    if (/only be created for service items/i.test(err.message)) {
      return 'Este artículo no es un servicio.'
    }
    if (err.status === 404) return 'Este servicio ya no está disponible.'
  }
  return 'No pudimos enviar tu solicitud. Inténtalo de nuevo.'
}

/**
 * Books a service ("Solicitar"): `POST /request/create` with the buyer's note,
 * then sends them to their requests list to watch for the seller's quote.
 *
 * The API has no find-or-create — posting twice books twice — so `sending`
 * guards the double submit.
 */
export function useServiceRequest() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [sending, setSending] = useState(false)

  const request = useCallback(
    async (item: Item, customerNote = ''): Promise<RequestOutcome> => {
      if (!isAuthenticated) return { kind: 'needs-auth' }
      if (sending) return { kind: 'sent' }

      setSending(true)
      try {
        // Booking is non-idempotent (no find-or-create), so it runs at the
        // standard pace with the button held as a bar — see lib/pendingAction.
        await withMinDuration(createRequest(item._id, customerNote))
        // Land on Compras, where the request now sits alongside product
        // orders and the seller's quote will appear.
        navigate('/transactions')
        return { kind: 'sent' }
      } catch (err) {
        return { kind: 'error', message: messageFor(err) }
      } finally {
        setSending(false)
      }
    },
    [isAuthenticated, sending, navigate],
  )

  return { request, sending }
}
