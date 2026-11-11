import { useEffect, useState } from 'react'

import { useInventory } from '@/features/inventory/useInventory'

/** Object URL for a stored photo, released when no longer shown. */
export function usePhotoUrl(photoId: string | null): string | null {
  const { getPhoto } = useInventory()
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!photoId) return
    let cancelled = false
    let created: string | null = null
    getPhoto(photoId).then(
      (blob) => {
        if (cancelled || !blob) return
        created = URL.createObjectURL(blob)
        setUrl(created)
      },
      () => undefined,
    )
    return () => {
      cancelled = true
      if (created) URL.revokeObjectURL(created)
      setUrl(null)
    }
  }, [photoId, getPhoto])

  return photoId ? url : null
}
