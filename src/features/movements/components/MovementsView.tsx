import { EmptyState } from '@/components/ui/EmptyState'
import { useInventory } from '@/features/inventory/useInventory'
import { useI18n } from '@/i18n'

import { MovementList } from './MovementList'

/** How many recent movements are shown; older ones stay in the backup. */
const SHOWN_MOVEMENTS = 300

export function MovementsView() {
  const { movements } = useInventory()
  const { t } = useI18n()

  if (movements.length === 0) {
    return (
      <EmptyState title={t('movements.emptyTitle')} description={t('movements.emptyDescription')} />
    )
  }

  return <MovementList movements={movements.slice(0, SHOWN_MOVEMENTS)} showProduct />
}
