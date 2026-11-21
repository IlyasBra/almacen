import { type ReactNode } from 'react'

import { chipClassName, chipOff, chipOn } from '@/components/ui/styles'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'

import { type Category } from '../types'

interface CategoryChipsProps {
  categories: readonly Category[]
  /** Offer "No category" too. */
  hasUncategorized: boolean
  /** 'all', 'none' or a category id. */
  value: string
  onChange: (value: string) => void
  /** Extra buttons after the categories. */
  children?: ReactNode
}

/** A row of pills to show only the products of one category. */
export function CategoryChips({
  categories,
  hasUncategorized,
  value,
  onChange,
  children,
}: CategoryChipsProps) {
  const { t } = useI18n()
  const options = [
    { id: 'all', name: t('inventory.allCategories') },
    ...categories,
    ...(hasUncategorized && categories.length > 0
      ? [{ id: 'none', name: t('inventory.noCategory') }]
      : []),
  ]
  return (
    <div
      role="group"
      aria-label={t('inventory.categoryGroup')}
      className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1"
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={value === option.id}
          onClick={() => {
            onChange(option.id)
          }}
          className={cn(chipClassName, value === option.id ? chipOn : chipOff)}
        >
          {option.name}
        </button>
      ))}
      {children}
    </div>
  )
}
