import { useEffect, useState } from 'react'

import { requestPersistentStorage } from '@/lib/storage'

/** Requests persistent storage once. null while unknown, then true/false. */
export function usePersistentStorage(): boolean | null {
  const [persisted, setPersisted] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    void requestPersistentStorage().then((result) => {
      if (!cancelled) setPersisted(result)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return persisted
}
