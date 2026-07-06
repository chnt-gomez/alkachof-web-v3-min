import { useCallback, useEffect, useState } from 'react'

export type SectionStatus = 'loading' | 'ready' | 'error'

/**
 * Loads one independent block of the home screen so a failure in one
 * section never blanks the others. `load` must be referentially stable
 * (wrap it in useCallback at the call site).
 */
export function useAsyncSection<T>(load: () => Promise<T>) {
  const [status, setStatus] = useState<SectionStatus>('loading')
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
    reload()
  }, [reload])

  return { status, data, reload }
}
