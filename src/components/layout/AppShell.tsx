import { type ReactNode } from 'react'

import { BoxIcon } from '@/components/ui/icons'
import { useI18n } from '@/i18n'

interface AppShellProps {
  /** Main navigation: bottom bar on phones, under the header on desktop. */
  nav?: ReactNode
  /** Buttons shown at the right of the header. */
  headerActions?: ReactNode
  children: ReactNode
}

export function AppShell({ nav, headerActions, children }: AppShellProps) {
  const { t } = useI18n()
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:shadow dark:focus:bg-slate-800"
      >
        {t('layout.skip')}
      </a>
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 pt-[env(safe-area-inset-top)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-3">
          <p className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <BoxIcon className="size-6 text-brand-600 dark:text-brand-400" />
            {t('app.name')}
          </p>
          <div className="flex items-center gap-2">{headerActions}</div>
        </div>
      </header>
      {nav}
      {/* Bottom padding leaves room for the fixed bottom bar and the action buttons. */}
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-2xl flex-1 px-4 pt-5 pb-44 focus:outline-none md:pb-28"
      >
        {children}
      </main>
    </div>
  )
}
