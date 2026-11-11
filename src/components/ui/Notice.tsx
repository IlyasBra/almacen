import { type ReactNode } from 'react'

import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'

import { Button } from './Button'
import { CloseIcon } from './icons'

interface NoticeProps {
  tone: 'error' | 'warning'
  children: ReactNode
  onDismiss?: () => void
}

/** Inline message. Errors use role="alert" so screen readers announce them. */
export function Notice({ tone, children, onDismiss }: NoticeProps) {
  const { t } = useI18n()
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2 rounded-xl px-4 py-3 text-sm',
        tone === 'error'
          ? 'bg-red-50 text-red-900 ring-1 ring-red-200 dark:bg-red-950 dark:text-red-100 dark:ring-red-900'
          : 'bg-amber-50 text-amber-950 ring-1 ring-amber-200 dark:bg-amber-950 dark:text-amber-100 dark:ring-amber-900',
      )}
    >
      <div className="flex-1 py-0.5">{children}</div>
      {onDismiss && (
        <Button variant="ghost" size="sm" onClick={onDismiss} className="-my-1 -me-2">
          <CloseIcon className="size-4" />
          <span className="sr-only">{t('notice.dismiss')}</span>
        </Button>
      )}
    </div>
  )
}
