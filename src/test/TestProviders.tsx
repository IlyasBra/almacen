import { type ReactNode } from 'react'

import { type Repositories } from '@/db/createRepositories'
import { InventoryProvider } from '@/features/inventory/InventoryProvider'

/** The data provider the screens need, backed by the given repositories. */
export function TestProviders({
  repositories,
  children,
}: {
  repositories: Repositories
  children: ReactNode
}) {
  return <InventoryProvider repositories={repositories}>{children}</InventoryProvider>
}
