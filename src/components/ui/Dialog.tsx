import { type ReactNode, useEffect, useId, useRef } from 'react'

import { useI18n } from '@/i18n'

import { Button } from './Button'
import { CloseIcon } from './icons'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

/**
 * Modal built on the native <dialog> element: the browser handles focus
 * trapping, Escape to close and hiding the rest of the page from screen
 * readers. On phones it is shown as a bottom sheet.
 */
export function Dialog({ open, onClose, title, children }: DialogProps) {
  const { t } = useI18n()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    // Tapping the backdrop closes the dialog; keyboard users have Escape and
    // the close button, so the click handler needs no key equivalent.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      className="fixed inset-x-0 top-auto bottom-0 m-0 mx-auto max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white text-slate-900 shadow-xl backdrop:bg-slate-950/50 sm:inset-y-0 sm:my-auto sm:rounded-2xl dark:bg-slate-900 dark:text-slate-100"
    >
      <div className="px-5 pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="-me-2">
            <CloseIcon />
            <span className="sr-only">{t('common.close')}</span>
          </Button>
        </div>
        {children}
      </div>
    </dialog>
  )
}
