import { useEffect, useRef } from 'react'

import { Button } from '@/components/ui/Button'
import { CloseIcon } from '@/components/ui/icons'
import { useI18n } from '@/i18n'

import { usePhotoUrl } from './usePhotoUrl'

interface PhotoViewerProps {
  photoId: string
  /** Product name, read out as the title of the picture. */
  name: string
  onClose: () => void
}

/**
 * The whole photo, full screen on black. A tap anywhere, the close button or
 * Escape closes it. Pinching zooms further, as in any page.
 */
export function PhotoViewer({ photoId, name, onClose }: PhotoViewerProps) {
  const { t } = useI18n()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const url = usePhotoUrl(photoId)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      aria-label={name}
      onClose={(event) => {
        // React lets "close" bubble to the dialog this viewer sits in, which would close it too.
        event.stopPropagation()
        onClose()
      }}
      className="fixed inset-0 m-0 size-full max-h-none max-w-none bg-black text-white backdrop:bg-black"
    >
      {/* A tap anywhere closes; the visible close button is the one for keyboards and readers. */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={() => {
          dialogRef.current?.close()
        }}
        className="absolute inset-0 cursor-zoom-out"
      />
      <div className="pointer-events-none grid size-full place-items-center p-2 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        {url && <img src={url} alt={name} className="max-h-full max-w-full object-contain" />}
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          dialogRef.current?.close()
        }}
        className="absolute end-3 top-[calc(0.75rem+env(safe-area-inset-top))] bg-black/60 text-white hover:bg-white/20 hover:text-white dark:text-white"
      >
        <CloseIcon />
        <span className="sr-only">{t('common.close')}</span>
      </Button>
    </dialog>
  )
}
