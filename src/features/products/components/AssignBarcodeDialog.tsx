import { useState } from 'react'

import { Dialog } from '@/components/ui/Dialog'
import { SearchIcon } from '@/components/ui/icons'
import { inputClassName } from '@/components/ui/styles'
import { useInventory } from '@/features/inventory/useInventory'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'

import { EMPTY_PRODUCT_FILTER, filterProducts } from '../selectors'
import { type Product } from '../types'
import { ProductRow } from './ProductRow'

interface AssignBarcodeDialogProps {
  /** Code to give to a product; null closes the dialog. */
  barcode: string | null
  onClose: () => void
  onAssigned: (product: Product) => void
}

/** Gives a scanned code to a product that was created without one. */
export function AssignBarcodeDialog({ barcode, onClose, onAssigned }: AssignBarcodeDialogProps) {
  const { products, assignBarcode } = useInventory()
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const visible = filterProducts(products, { ...EMPTY_PRODUCT_FILTER, query })

  return (
    <Dialog open={barcode !== null} onClose={onClose} title={t('assign.title')}>
      <div className="space-y-4">
        <p className="text-sm">
          {t('assign.intro')}
          <span className="font-mono font-medium">{barcode}</span>.
        </p>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            aria-label={t('inventory.search')}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
            }}
            placeholder={t('inventory.search')}
            className={cn(inputClassName, 'ps-10')}
          />
        </div>
        <ul className="space-y-2">
          {visible.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              detail={
                product.barcode ? t('assign.current', { code: product.barcode }) : t('assign.none')
              }
              onOpen={(chosen) => {
                if (!barcode) return
                void assignBarcode(chosen.id, barcode).then((done) => {
                  if (done) onAssigned(chosen)
                })
              }}
            />
          ))}
        </ul>
      </div>
    </Dialog>
  )
}
