import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { CopyIcon, ShareIcon } from '@/components/ui/icons'
import { useInventory } from '@/features/inventory/useInventory'
import { ProductRow } from '@/features/products/components/ProductRow'
import { formatAmount, suggestedOrder } from '@/features/products/model'
import { useI18n } from '@/i18n'
import { restockList, restockText } from '@/features/products/selectors'
import { type Product } from '@/features/products/types'

interface RestockViewProps {
  onOpen: (product: Product) => void
}

/** Sold out and low products, with the list ready to send to the supplier. */
export function RestockView({ onOpen }: RestockViewProps) {
  const { products } = useInventory()
  const { t } = useI18n()
  const list = restockList(products)
  const [feedback, setFeedback] = useState<string | null>(null)
  const text = restockText(products, formatAmount)
  const canShare = typeof navigator.share === 'function'

  if (list.length === 0) {
    return (
      <EmptyState title={t('restock.allGoodTitle')} description={t('restock.allGoodDescription')} />
    )
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setFeedback(t('restock.copied'))
    } catch {
      setFeedback(t('restock.copyFailed'))
    }
  }

  const share = async () => {
    try {
      await navigator.share({ title: t('restock.textTitle'), text })
    } catch {
      // Cancelled by the person: nothing to do.
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {canShare && (
          <Button variant="primary" onClick={() => void share()}>
            <ShareIcon />
            {t('restock.share')}
          </Button>
        )}
        <Button onClick={() => void copy()}>
          <CopyIcon />
          {t('restock.copy')}
        </Button>
      </div>
      {feedback && (
        <p role="status" className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
          {feedback}
        </p>
      )}
      <ul className="space-y-2" aria-label={t('restock.listLabel')}>
        {list.map((product) => {
          const order = suggestedOrder(product)
          return (
            <ProductRow
              key={product.id}
              product={product}
              detail={
                product.minimum > 0
                  ? [
                      t('restock.warningAt', { amount: formatAmount(product.minimum) }),
                      order > 0 ? t('restock.orderSome', { amount: formatAmount(order) }) : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  : t('restock.noWarning')
              }
              onOpen={onOpen}
            />
          )
        })}
      </ul>
      <p className="text-xs text-slate-600 dark:text-slate-400">{t('restock.hint')}</p>
    </div>
  )
}
