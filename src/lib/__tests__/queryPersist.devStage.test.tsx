import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/*
  Persistence is off in dev stage, and not as a preference.

  The dev-stage mocks keep their state in module-level variables that reset on
  reload — `mockInstagramStore` starts un-enrolled every time, which `CLAUDE.md`
  documents as the way to replay the enrollment wizard. A persisted
  `/instagram/status` would survive that reload and contradict the store, pinning
  the dev session to the cooldown screen with no way out but clearing site data.

  Its own file because `IS_DEV_STAGE` is a module constant: it has to be mocked
  before anything imports it.
*/
vi.mock('@/lib/stage', () => ({ IS_DEV_STAGE: true }))
vi.mock('@/sections/auth/actions/fetchProfile')

import { AppQueryProvider } from '../queryPersist'
import { queryClient } from '../queryClient'
import { QUERY_STORAGE_KEY } from '../queryStorage'
import { AuthProvider } from '@/sections/auth/AuthContext'
import { useAuth } from '@/sections/auth/useAuth'
import { fetchProfile } from '@/sections/auth/actions/fetchProfile'

function Probe() {
  const { profile } = useAuth()
  return <p>Perfil: {profile?.alias ?? 'ninguno'}</p>
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  queryClient.clear()
  localStorage.setItem('alk.token', 'token-user1')
  vi.mocked(fetchProfile).mockResolvedValue({ _id: 'p1', userId: 'user1', alias: 'Ana' })
})

describe('query persistence in dev stage', () => {
  it('writes nothing to disk', async () => {
    render(
      <AppQueryProvider>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </AppQueryProvider>,
    )

    expect(await screen.findByText('Perfil: Ana')).toBeInTheDocument()
    // Well past the persister's 200ms throttle.
    await new Promise((r) => setTimeout(r, 400))
    expect(localStorage.getItem(QUERY_STORAGE_KEY)).toBeNull()
  })

  it('ignores a blob that is already on disk', async () => {
    // As if the app had run against a real backend on this device before.
    localStorage.setItem(
      QUERY_STORAGE_KEY,
      JSON.stringify({
        buster: 'test',
        timestamp: Date.now(),
        clientState: {
          mutations: [],
          queries: [
            {
              queryKey: ['profile'],
              queryHash: '["profile"]',
              state: {
                data: { _id: 'stale', userId: 'stale', alias: 'Perfil viejo' },
                dataUpdatedAt: Date.now(),
                status: 'success',
                fetchStatus: 'idle',
              },
            },
          ],
        },
      }),
    )

    render(
      <AppQueryProvider>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </AppQueryProvider>,
    )

    // The mock answers, not the disk — otherwise the dev session would be run by
    // state its own mock stores know nothing about.
    expect(await screen.findByText('Perfil: Ana')).toBeInTheDocument()
    await waitFor(() => expect(fetchProfile).toHaveBeenCalledTimes(1))
  })
})
