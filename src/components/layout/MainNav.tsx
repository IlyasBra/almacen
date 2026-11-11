import { type ReactNode } from 'react'

import { cn } from '@/lib/cn'

export interface NavItem {
  id: string
  label: string
  href: string
  icon: ReactNode
}

interface MainNavProps {
  items: NavItem[]
  currentId: string
}

/**
 * Plain links (not buttons) so each view has its own URL and works with
 * the browser's back button. Fixed at the bottom on phones, where the
 * thumb reaches; a tab bar under the header from md up.
 */
export function MainNav({ items, currentId }: MainNavProps) {
  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:sticky md:top-[calc(3.75rem+env(safe-area-inset-top))] md:bottom-auto md:border-t-0 md:border-b md:pb-0 dark:border-slate-800 dark:bg-slate-900/95"
    >
      <ul className="mx-auto flex max-w-2xl md:gap-2 md:px-4">
        {items.map((item) => {
          const isCurrent = item.id === currentId
          return (
            <li key={item.id} className="flex-1 md:flex-none">
              <a
                href={item.href}
                aria-current={isCurrent ? 'page' : undefined}
                className={cn(
                  'flex h-16 flex-col items-center justify-center gap-0.5 text-xs font-medium md:h-12 md:flex-row md:gap-2 md:border-b-2 md:px-2 md:text-sm',
                  isCurrent
                    ? 'text-brand-600 md:border-brand-600 dark:text-brand-400 dark:md:border-brand-400'
                    : 'text-slate-500 hover:text-slate-900 md:border-transparent dark:text-slate-400 dark:hover:text-white',
                )}
              >
                {item.icon}
                {item.label}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
