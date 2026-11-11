import { type ChangeEvent, type SubmitEvent, useEffect, useId, useRef, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { CameraIcon, CloseIcon } from '@/components/ui/icons'
import { inputClassName } from '@/components/ui/styles'

import {
  decodeImageFile,
  SCANNER_ERROR_MESSAGES,
  ScannerError,
  type ScannerHandle,
  startLiveScanner,
} from './scanner'

interface ScannerDialogProps {
  open: boolean
  onClose: () => void
  /** Called once with the code; the dialog has already stopped the camera. */
  onDetected: (code: string) => void
}

type ScanState =
  | { kind: 'starting' }
  | { kind: 'scanning' }
  | { kind: 'error'; message: string }
  | { kind: 'reading-photo' }

/**
 * Full-screen barcode reader. The camera opens as soon as the dialog does,
 * and closes by itself when a code is read, like a shop scanner. If the live
 * camera cannot be used, the person can take a photo or type the code.
 */
export function ScannerDialog({ open, onClose, onDetected }: ScannerDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [state, setState] = useState<ScanState>({ kind: 'starting' })
  const [typing, setTyping] = useState(false)
  const titleId = useId()
  const codeId = useId()

  // Latest callbacks without restarting the camera when they change.
  const onDetectedRef = useRef(onDetected)
  useEffect(() => {
    onDetectedRef.current = onDetected
  }, [onDetected])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    const video = videoRef.current
    if (!open || !video) return
    let handle: ScannerHandle | null = null
    let cancelled = false
    setState({ kind: 'starting' })
    setTyping(false)

    startLiveScanner(video, (code) => {
      if ('vibrate' in navigator) navigator.vibrate(80)
      onDetectedRef.current(code)
    }).then(
      (started) => {
        if (cancelled) started.stop()
        else {
          handle = started
          setState({ kind: 'scanning' })
        }
      },
      (error: unknown) => {
        if (cancelled) return
        const message =
          error instanceof ScannerError
            ? SCANNER_ERROR_MESSAGES[error.kind]
            : SCANNER_ERROR_MESSAGES.failed
        setState({ kind: 'error', message })
      },
    )

    return () => {
      cancelled = true
      handle?.stop()
    }
  }, [open])

  const readPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    setState({ kind: 'reading-photo' })
    const code = await decodeImageFile(file).catch(() => null)
    if (code) onDetectedRef.current(code)
    else
      setState({
        kind: 'error',
        message: 'No se ha podido leer el código en la foto. Acércate más, con buena luz.',
      })
  }

  const submitCode = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    const code = new FormData(event.currentTarget).get('code')
    if (typeof code === 'string' && code.trim() !== '') onDetectedRef.current(code.trim())
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-black text-white backdrop:bg-black"
    >
      <div className="relative flex h-full flex-col">
        <div className="flex items-center justify-between gap-4 px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3">
          <h2 id={titleId} className="text-lg font-semibold">
            Escanear código
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="-mr-2 text-white hover:bg-white/10 hover:text-white dark:text-white"
          >
            <CloseIcon />
            <span className="sr-only">Cerrar</span>
          </Button>
        </div>

        <div className="relative flex-1 overflow-hidden">
          <video
            ref={videoRef}
            className="absolute inset-0 size-full object-cover"
            muted
            playsInline
            aria-hidden="true"
          />
          {state.kind !== 'error' && (
            <div aria-hidden="true" className="absolute inset-0 grid place-items-center">
              <div className="relative h-40 w-[78%] max-w-sm rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] ring-2 ring-white/90">
                <div className="absolute inset-x-4 top-1/2 h-0.5 -translate-y-1/2 animate-pulse bg-red-500" />
              </div>
            </div>
          )}
          <p
            role="status"
            className="absolute inset-x-4 bottom-4 rounded-xl bg-black/60 px-4 py-3 text-center text-sm"
          >
            {state.kind === 'starting' && 'Abriendo la cámara…'}
            {state.kind === 'scanning' && 'Apunta al código de barras. Se leerá solo.'}
            {state.kind === 'reading-photo' && 'Leyendo el código de la foto…'}
            {state.kind === 'error' && state.message}
          </p>
        </div>

        <div className="space-y-3 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {typing ? (
            <form onSubmit={submitCode} className="flex gap-2">
              <label htmlFor={codeId} className="sr-only">
                Código de barras
              </label>
              <input
                id={codeId}
                name="code"
                inputMode="numeric"
                autoComplete="off"
                // The person just asked to type, so the field should be ready.
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
                placeholder="Escribe el código"
                className={inputClassName}
              />
              <Button type="submit" variant="primary">
                Buscar
              </Button>
            </form>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-white/10 px-3 text-sm font-medium focus-within:ring-2 focus-within:ring-white hover:bg-white/20">
                <CameraIcon />
                Hacer foto
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={(event) => void readPhoto(event)}
                />
              </label>
              <Button
                onClick={() => {
                  setTyping(true)
                }}
                className="justify-center bg-white/10 text-sm text-white ring-0 hover:bg-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
              >
                Escribir código
              </Button>
            </div>
          )}
        </div>
      </div>
    </dialog>
  )
}
