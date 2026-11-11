import { format, isToday, isYesterday } from 'date-fns'
import { es } from 'date-fns/locale'

import { formatAmount } from '@/features/products/model'
import { cn } from '@/lib/cn'

import { groupMovementsByDay, MOVEMENT_KIND_LABELS } from '../model'
import { type Movement } from '../types'

interface MovementListProps {
  movements: readonly Movement[]
  /** False inside a product, where the name is already known. */
  showProduct: boolean
}

const SIGN: Record<Movement['kind'], string> = { in: '+', new: '+', out: '−', adjust: '=' }
const ICON_CLASS: Record<Movement['kind'], string> = {
  in: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  new: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  out: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  adjust: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
}

function dayLabel(day: string): string {
  const [year = 0, month = 1, date = 1] = day.split('-').map(Number)
  const value = new Date(year, month - 1, date)
  if (isToday(value)) return 'Hoy'
  if (isYesterday(value)) return 'Ayer'
  return format(value, "EEEE d 'de' MMMM", { locale: es })
}

export function MovementList({ movements, showProduct }: MovementListProps) {
  return (
    <div className="space-y-4">
      {groupMovementsByDay(movements).map((group) => (
        <section key={group.day} aria-label={dayLabel(group.day)}>
          <h3 className="mb-1.5 text-sm font-medium text-slate-600 first-letter:uppercase dark:text-slate-400">
            {dayLabel(group.day)}
          </h3>
          <ul className="divide-y divide-slate-200 rounded-xl bg-white px-3 ring-1 ring-slate-200 dark:divide-slate-800 dark:bg-slate-900 dark:ring-slate-800">
            {group.movements.map((movement) => (
              <li key={movement.id} className="flex items-center gap-3 py-2.5">
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid size-8 shrink-0 place-items-center rounded-lg font-semibold',
                    ICON_CLASS[movement.kind],
                  )}
                >
                  {SIGN[movement.kind]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium break-words">
                    {showProduct ? movement.productName : MOVEMENT_KIND_LABELS[movement.kind]}
                  </span>
                  <span className="block text-sm text-slate-600 dark:text-slate-400">
                    {[
                      showProduct ? MOVEMENT_KIND_LABELS[movement.kind] : null,
                      format(new Date(movement.createdAt), 'HH:mm'),
                      movement.note || null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-lg leading-tight font-semibold tabular-nums">
                    {movement.kind === 'adjust'
                      ? formatAmount(movement.resultingQuantity)
                      : `${SIGN[movement.kind]}${formatAmount(movement.amount)}`}
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    quedan {formatAmount(movement.resultingQuantity)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
