import { ProductPhoto } from '@/features/photos/ProductPhoto'
import { cn } from '@/lib/cn'

import { useI18n } from '@/i18n'

import { formatAmount, unitLabel } from '../model'
import { productStatus } from '../selectors'
import { type Product } from '../types'
import { STATUS_STRIPE } from './statusStyles'
import { StockBadge } from './StockBadge'

interface ProductRowProps {
  product: Product
  /** Second line under the name. */
  detail: string
  onOpen: (product: Product) => void
}

export function ProductRow({ product, detail, onOpen }: ProductRowProps) {
  useI18n() // re-render when the language changes
  const status = productStatus(product)
  return (
    <li>
      <button
        type="button"
        onClick={() => {
          onOpen(product)
        }}
        className={cn(
          'relative flex w-full items-center gap-3 overflow-hidden rounded-xl bg-white py-2 ps-3 pe-3 text-start ring-1 ring-slate-200 before:absolute before:inset-y-0 before:start-0 before:w-1 hover:bg-slate-50 dark:bg-slate-900 dark:ring-slate-800 dark:hover:bg-slate-800/60',
          STATUS_STRIPE[status],
        )}
      >
        <ProductPhoto
          photoId={product.photoId}
          name={product.name}
          className="ms-1 size-12 rounded-lg text-base"
        />
        <span className="min-w-0 flex-1">
          <span className="block font-medium break-words">{product.name}</span>
          <span className="block text-sm break-words text-slate-600 dark:text-slate-400">
            {detail}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span dir="ltr" className="text-xl leading-none font-semibold tabular-nums">
            {formatAmount(product.quantity)}
            <span className="sr-only"> {unitLabel(product.unit)}</span>
          </span>
          <span aria-hidden="true" className="text-xs text-slate-500 dark:text-slate-400">
            {unitLabel(product.unit)}
          </span>
          <StockBadge status={status} />
        </span>
      </button>
    </li>
  )
}
