import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ShareIcon } from '@/components/ui/icons'
import { CategoryChips } from '@/features/categories/components/CategoryChips'
import { useInventory } from '@/features/inventory/useInventory'
import { ProductRow } from '@/features/products/components/ProductRow'
import { formatAmount } from '@/features/products/model'
import { inCategory, restockList } from '@/features/products/selectors'
import { type Product } from '@/features/products/types'
import { intlLocale, useI18n } from '@/i18n'

import { createRestockPdf } from './restockPdf'

interface RestockViewProps {
  onOpen: (product: Product) => void
}

/** Shares the PDF where the phone allows it; otherwise saves it as a download. */
async function deliver(file: File, title: string): Promise<void> {
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title })
    } catch (error) {
      // Closing the share sheet is not an error.
      if (!(error instanceof DOMException && error.name === 'AbortError')) throw error
    }
    return
  }
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 10_000)
}

/** Sold out and low products, with a PDF (photo, name, barcode) for the supplier. */
export function RestockView({ onOpen }: RestockViewProps) {
  const { products, categories, getPhoto } = useInventory()
  const { t, language, dir } = useI18n()
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState<'idle' | 'busy' | 'failed'>('idle')

  const all = restockList(products)
  if (all.length === 0) {
    return (
      <EmptyState title={t('restock.allGoodTitle')} description={t('restock.allGoodDescription')} />
    )
  }

  // Only the categories that still have something to restock.
  const usedIds = new Set(all.map((product) => product.categoryId))
  const shownCategories = categories.filter((item) => usedIds.has(item.id))
  const hasUncategorized = usedIds.has(null)
  const offered =
    category === 'all' ||
    (category === 'none' ? hasUncategorized && shownCategories.length > 0 : usedIds.has(category))
  const selected = offered ? category : 'all'
  const list = all.filter((product) => inCategory(product, selected))

  const sendPdf = async () => {
    setStatus('busy')
    try {
      const now = new Date()
      const items = await Promise.all(
        list.map(async (product) => ({
          name: product.name,
          barcode: product.barcode,
          photo: product.photoId ? ((await getPhoto(product.photoId)) ?? null) : null,
        })),
      )
      const blob = await createRestockPdf(items, {
        title: t('restock.pdfTitle'),
        date: new Intl.DateTimeFormat(intlLocale(language), { dateStyle: 'long' }).format(now),
        barcode: t('restock.pdfBarcode'),
        noBarcode: t('restock.pdfNoBarcode'),
        rtl: dir === 'rtl',
      })
      const day = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
        .map((part) => String(part).padStart(2, '0'))
        .join('-')
      await deliver(
        new File([blob], `pedido-almacen-${day}.pdf`, { type: 'application/pdf' }),
        t('restock.pdfTitle'),
      )
      setStatus('idle')
    } catch {
      setStatus('failed')
    }
  }

  return (
    <div className="space-y-4">
      <CategoryChips
        categories={shownCategories}
        hasUncategorized={hasUncategorized}
        value={selected}
        onChange={setCategory}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" disabled={status === 'busy'} onClick={() => void sendPdf()}>
          <ShareIcon />
          {t('restock.sendPdf')}
        </Button>
        {status === 'busy' && (
          <p role="status" className="text-sm text-slate-600 dark:text-slate-400">
            {t('restock.pdfCreating')}
          </p>
        )}
        {status === 'failed' && (
          <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">
            {t('restock.pdfFailed')}
          </p>
        )}
      </div>
      <ul className="space-y-2" aria-label={t('restock.listLabel')}>
        {list.map((product) => (
          <ProductRow
            key={product.id}
            product={product}
            detail={
              product.minimum > 0
                ? t('restock.warningAt', { amount: formatAmount(product.minimum) })
                : t('restock.noWarning')
            }
            onOpen={onOpen}
          />
        ))}
      </ul>
    </div>
  )
}
