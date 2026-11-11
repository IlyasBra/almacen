import { useEffect, useRef } from 'react'

import { Button } from './Button'

interface ConfirmDeleteProps {
  /** Name of the item, shown in the question. */
  itemName: string
  onCancel: () => void
  onConfirm: () => void
}

/** Inline "are you sure?" step, used inside dialogs instead of confirm(). */
export function ConfirmDelete({ itemName, onCancel, onConfirm }: ConfirmDeleteProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  // The button that opened this step is gone; move focus to the safe choice
  // so keyboard and screen reader users are not lost.
  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  return (
    <div className="space-y-4">
      <p role="alert">
        ¿Seguro que quieres borrar <strong className="break-words">«{itemName}»</strong>? No se
        puede deshacer.
      </p>
      <div className="flex justify-end gap-2">
        <Button ref={cancelRef} onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          Borrar
        </Button>
      </div>
    </div>
  )
}
