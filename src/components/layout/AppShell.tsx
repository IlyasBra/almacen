import { type ReactNode } from 'react'

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
          <svg
            role="img"
            aria-label={t('app.name')}
            viewBox="0 0 120 120"
            className="size-10 shrink-0"
          >
            <rect width="120" height="120" rx="28" fill="#1d4ed8" />
            <g stroke="#fff" strokeWidth="5" strokeLinecap="round">
              <line x1="26" y1="22" x2="26" y2="96" />
              <line x1="94" y1="22" x2="94" y2="96" />
              <line x1="26" y1="56" x2="94" y2="56" />
              <line x1="26" y1="88" x2="94" y2="88" />
            </g>
            <g fill="#fff" fillOpacity="0.92">
              <rect x="34" y="34" width="16" height="19" rx="2" />
              <rect x="54" y="26" width="14" height="27" rx="2" />
              <rect x="72" y="38" width="14" height="15" rx="2" />
              <rect x="34" y="66" width="20" height="19" rx="2" />
              <rect x="58" y="60" width="12" height="25" rx="2" />
              <rect x="74" y="70" width="14" height="15" rx="2" />
            </g>
          </svg>
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
