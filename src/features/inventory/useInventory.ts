import { use } from 'react'

import { InventoryContext, type InventoryContextValue } from './InventoryContext'

export function useInventory(): InventoryContextValue {
  const context = use(InventoryContext)
  if (!context) throw new Error('useInventory must be used inside <InventoryProvider>')
  return context
}
