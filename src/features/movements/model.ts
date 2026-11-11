import { type MessageKey, t } from '@/i18n'
import { type EntityModel } from '@/lib/data/repository'

import { type Movement, type MovementChanges, type MovementInput, type MovementKind } from './types'

export function buildMovement(input: MovementInput, id: string, now: Date): Movement {
  return { id, ...input, note: input.note.trim(), createdAt: now.toISOString() }
}

export const movementModel: EntityModel<Movement, MovementInput, MovementChanges> = {
  build: buildMovement,
  // Movements are an append-only log.
  applyChanges: (movement) => movement,
}

const KIND_KEYS: Record<MovementKind, MessageKey> = {
  in: 'movement.in',
  out: 'movement.out',
  adjust: 'movement.adjust',
  new: 'movement.new',
}

export function movementKindLabel(kind: MovementKind): string {
  return t(KIND_KEYS[kind])
}

/** Kind of movement that takes stock from `before` to `after` with +/- buttons. */
export function kindForChange(before: number, after: number): MovementKind {
  return after >= before ? 'in' : 'out'
}

/** Newest first. */
export function sortMovements(movements: readonly Movement[]): Movement[] {
  return movements.toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export interface MovementDay {
  /** Local day, yyyy-MM-dd. */
  day: string
  movements: Movement[]
}

function localDay(timestamp: string): string {
  const date = new Date(timestamp)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Groups movements (any order) by local day, newest day and movement first. */
export function groupMovementsByDay(movements: readonly Movement[]): MovementDay[] {
  const groups: MovementDay[] = []
  for (const movement of sortMovements(movements)) {
    const day = localDay(movement.createdAt)
    const last = groups.at(-1)
    if (last?.day === day) last.movements.push(movement)
    else groups.push({ day, movements: [movement] })
  }
  return groups
}
