import { useId } from 'react'

import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { SearchIcon } from '@/components/ui/icons'
import { chipClassName, inputClassName } from '@/components/ui/styles'
import { CategoryChips } from '@/features/categories/components/CategoryChips'
import { useInventory } from '@/features/inventory/useInventory'
import { SendPdfButton } from '@/features/restock/SendPdfButton'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'

import { filterProducts, type ProductFilter, restockList, summarizeStock } from '../selectors'
import { type Product, type StockStatus } from '../types'
import { ProductRow } from './ProductRow'

interface InventoryViewProps {
  filter: ProductFilter
  onFilterChange: (filter: ProductFilter) => void
  onOpen: (product: Product) => void
  onCreate: () => void
  onManageCategories: () => void
}

export function InventoryView({
  filter,
  onFilterChange,
  onOpen,
  onCreate,
  onManageCategories,
}: InventoryViewProps) {
  const { products, categories } = useInventory()
  const { t } = useI18n()
  const searchId = useId()
  const summary = summarizeStock(products)
  const visible = filterProducts(products, filter)
  const categoryName = new Map(categories.map((category) => [category.id, category.name]))
  const hasUncategorized = products.some((product) => product.categoryId === null)

  if (products.length === 0) {
    return (
      <EmptyState
        title={t('inventory.emptyTitle')}
        description={t('inventory.emptyDescription')}
        action={
          <Button variant="primary" onClick={onCreate}>
            {t('inventory.addProduct')}
          </Button>
        }
      />
    )
  }

  const setStatus = (status: StockStatus | 'all') => {
    onFilterChange({ ...filter, status: filter.status === status ? 'all' : status })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <SummaryTile
          label={t('inventory.summaryProducts')}
          value={summary.total}
          pressed={filter.status === 'all'}
          onClick={() => {
            setStatus('all')
          }}
        />
        <SummaryTile
          label={t('inventory.summaryLow')}
          value={summary.low}
          tone="text-amber-700 dark:text-amber-400"
          pressed={filter.status === 'low'}
          onClick={() => {
            setStatus('low')
          }}
        />
        <SummaryTile
          label={t('inventory.summaryOut')}
          value={summary.out}
          tone="text-red-700 dark:text-red-400"
          pressed={filter.status === 'out'}
          onClick={() => {
            setStatus('out')
          }}
        />
      </div>

      {(filter.status === 'low' || filter.status === 'out') && visible.length > 0 && (
        <SendPdfButton products={restockList(visible)} />
      )}

      <div className="relative">
        <label htmlFor={searchId} className="sr-only">
          {t('inventory.search')}
        </label>
        <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
        <input
          id={searchId}
          type="search"
          value={filter.query}
          onChange={(event) => {
            onFilterChange({ ...filter, query: event.target.value })
          }}
          placeholder={t('inventory.searchPlaceholder')}
          autoComplete="off"
          className={cn(inputClassName, 'ps-10')}
        />
      </div>

      <CategoryChips
        categories={categories}
        hasUncategorized={hasUncategorized}
        value={filter.category}
        onChange={(category) => {
          onFilterChange({ ...filter, category })
        }}
      >
        <button
          type="button"
          onClick={onManageCategories}
          className={cn(
            chipClassName,
            'border border-dashed border-brand-500 text-brand-700 ring-0 dark:text-brand-400',
          )}
        >
          {categories.length > 0 ? t('inventory.editCategories') : t('inventory.createCategories')}
        </button>
      </CategoryChips>

      {visible.length === 0 ? (
        <EmptyState title={t('inventory.noMatch')} />
      ) : (
        <ul className="space-y-2" aria-label={t('inventory.listLabel')}>
          {visible.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              detail={
                [
                  product.categoryId ? categoryName.get(product.categoryId) : undefined,
                  product.location,
                ]
                  .filter(Boolean)
                  .join(' · ') || t('inventory.noDetail')
              }
              onOpen={onOpen}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

interface SummaryTileProps {
  label: string
  value: number
  tone?: string
  pressed: boolean
  onClick: () => void
}

function SummaryTile({ label, value, tone, pressed, onClick }: SummaryTileProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'rounded-xl bg-white px-3 py-2 text-start ring-1 dark:bg-slate-900',
        pressed ? 'ring-2 ring-brand-500' : 'ring-slate-200 dark:ring-slate-800',
      )}
    >
      <span className={cn('block text-2xl font-semibold tabular-nums', tone)}>{value}</span>
      <span className="block text-xs text-slate-600 dark:text-slate-400">{label}</span>
    </button>
  )
}
