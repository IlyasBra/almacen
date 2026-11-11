import { cn } from '@/lib/cn'

import { usePhotoUrl } from './usePhotoUrl'

interface ProductPhotoProps {
  photoId: string | null
  /** Used for the initials shown when there is no photo. */
  name: string
  className?: string
}

/** Product photo from the device storage, or the product's initials. */
export function ProductPhoto({ photoId, name, className }: ProductPhotoProps) {
  const url = usePhotoUrl(photoId)
  return (
    <div
      className={cn(
        'grid shrink-0 place-items-center overflow-hidden bg-brand-50 font-semibold text-brand-700 dark:bg-slate-800 dark:text-brand-400',
        className,
      )}
    >
      {url ? (
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        <span aria-hidden="true">{name.trim().slice(0, 2).toUpperCase() || '?'}</span>
      )}
    </div>
  )
}
