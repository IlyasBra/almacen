/**
 * - in: stock received
 * - out: stock taken out
 * - adjust: quantity corrected by hand from the product form
 * - new: initial stock of a newly created product
 */
export const MOVEMENT_KINDS = ['in', 'out', 'adjust', 'new'] as const
export type MovementKind = (typeof MOVEMENT_KINDS)[number]

/** One change of stock. Movements are a log: never edited, only added. */
export interface Movement {
  id: string
  productId: string
  /** Name and unit at the time, so the log still reads well after a rename or delete. */
  productName: string
  unit: string
  kind: MovementKind
  /** Always positive: how much came in, went out or changed. */
  amount: number
  /** Stock right after this movement. */
  resultingQuantity: number
  note: string
  createdAt: string
}

export type MovementInput = Omit<Movement, 'id' | 'createdAt'>
/** Movements are never edited. */
export type MovementChanges = never
