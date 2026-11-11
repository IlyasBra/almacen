import { Suspense, use } from 'react'

import { AppShell } from '@/components/layout/AppShell'
import { getRepositories } from '@/db/getRepositories'
import { InventoryProvider } from '@/features/inventory/InventoryProvider'
import { useDocumentLanguage, useI18n } from '@/i18n'

import { MainScreen } from './MainScreen'

export function App() {
  const { t } = useI18n()
  useDocumentLanguage()

  return (
    <Suspense
      fallback={
        <AppShell>
          <p className="text-slate-600 dark:text-slate-400">{t('common.loading')}</p>
        </AppShell>
      }
    >
      <DataLayer />
    </Suspense>
  )
}

/** Waits for the database to open (suspending meanwhile) and provides data. */
function DataLayer() {
  const repositories = use(getRepositories())

  return (
    <InventoryProvider repositories={repositories}>
      <MainScreen isPersistent={repositories.isPersistent} />
    </InventoryProvider>
  )
}
