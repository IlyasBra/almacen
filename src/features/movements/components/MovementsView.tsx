import { EmptyState } from '@/components/ui/EmptyState'
import { useInventory } from '@/features/inventory/useInventory'

import { MovementList } from './MovementList'

/** How many recent movements are shown; older ones stay in the backup. */
const SHOWN_MOVEMENTS = 300

export function MovementsView() {
  const { movements } = useInventory()

  if (movements.length === 0) {
    return (
      <EmptyState
        title="Sin movimientos"
        description="Cuando sumes o restes stock, aparecerá aquí con la fecha y la hora."
      />
    )
  }

  return <MovementList movements={movements.slice(0, SHOWN_MOVEMENTS)} showProduct />
}
