import { useCallback, useEffect, useRef, useState } from 'react'

/** Pause after the last tap before the change is saved. */
export const STOCK_SAVE_DELAY_MS = 900

/**
 * Collects quick +/- taps into one change: tapping + five times saves one
 * "+5" movement instead of five. The pending amount is saved after a pause,
 * and right away when the product changes or the component unmounts.
 */
export function usePendingStock(
  productId: string | null,
  commit: (productId: string, delta: number) => Promise<unknown>,
) {
  const [pending, setPending] = useState(0)
  const pendingRef = useRef({ productId, delta: 0 })
  const timerRef = useRef<number | undefined>(undefined)
  const commitRef = useRef(commit)
  useEffect(() => {
    commitRef.current = commit
  }, [commit])

  const flush = useCallback(() => {
    window.clearTimeout(timerRef.current)
    const { productId: id, delta } = pendingRef.current
    pendingRef.current = { productId: id, delta: 0 }
    setPending(0)
    if (id && delta !== 0) void commitRef.current(id, delta)
  }, [])

  // Save what is pending for the previous product before switching.
  useEffect(() => {
    pendingRef.current = { productId, delta: 0 }
    return flush
  }, [productId, flush])

  const add = useCallback(
    (delta: number) => {
      pendingRef.current = {
        productId: pendingRef.current.productId,
        delta: pendingRef.current.delta + delta,
      }
      setPending(pendingRef.current.delta)
      window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(flush, STOCK_SAVE_DELAY_MS)
    },
    [flush],
  )

  return { pending, add, flush }
}
