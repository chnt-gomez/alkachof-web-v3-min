import { useCallback, useEffect, useState } from 'react'

export type SectionStatus = 'idle' | 'loading' | 'ready' | 'error'

/**
 * Loads one independent block of the home screen so a failure in one
 * section never blanks the others. `load` must be referentially stable
 * (wrap it in useCallback at the call site).
 *
 * `enabled` defers the fetch — Home passes `false` for a tab the user has not
 * opened yet. Callers keep it `true` once flipped, so the hook fetches on first
 * open and switching tabs afterwards never re-hits the network.
 */
export function useAsyncSection<T>(load: () => Promise<T>, enabled = true) {
  const [status, setStatus] = useState<SectionStatus>(enabled ? 'loading' : 'idle')
  const [data, setData] = useState<T | null>(null)

  const reload = useCallback(async () => {
    setStatus('loading')
    try {
      setData(await load())
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }, [load])

  useEffect(() => {
    if (!enabled) return
    reload()
  }, [enabled, reload])

  return { status, data, reload }
}
