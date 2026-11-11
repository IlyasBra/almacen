import { type StockStatus } from '../types'

/** Coloured stripe on the left of a product row. */
export const STATUS_STRIPE: Record<StockStatus, string> = {
  ok: 'before:bg-emerald-500',
  low: 'before:bg-amber-500',
  out: 'before:bg-red-500',
}
