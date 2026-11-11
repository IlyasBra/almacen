import { ProductPhoto } from '@/features/photos/ProductPhoto'
import { cn } from '@/lib/cn'

import { formatAmount } from '../model'
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
  const status = productStatus(product)
  return (
    <li>
      <button
        type="button"
        onClick={() => {
          onOpen(product)
        }}
        className={cn(
          'relative flex w-full items-center gap-3 overflow-hidden rounded-xl bg-white py-2 pr-3 pl-3 text-left ring-1 ring-slate-200 before:absolute before:inset-y-0 before:left-0 before:w-1 hover:bg-slate-50 dark:bg-slate-900 dark:ring-slate-800 dark:hover:bg-slate-800/60',
          STATUS_STRIPE[status],
        )}
      >
        <ProductPhoto
          photoId={product.photoId}
          name={product.name}
          className="ml-1 size-12 rounded-lg text-base"
        />
        <span className="min-w-0 flex-1">
          <span className="block font-medium break-words">{product.name}</span>
          <span className="block text-sm break-words text-slate-600 dark:text-slate-400">
            {detail}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-xl leading-none font-semibold tabular-nums">
            {formatAmount(product.quantity)}
            <span className="sr-only"> {product.unit}</span>
          </span>
          <span aria-hidden="true" className="text-xs text-slate-500 dark:text-slate-400">
            {product.unit}
          </span>
          <StockBadge status={status} />
        </span>
      </button>
    </li>
  )
}
