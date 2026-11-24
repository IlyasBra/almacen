import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { ShareIcon } from '@/components/ui/icons'
import { useInventory } from '@/features/inventory/useInventory'
import { formatAmount, unitLabel } from '@/features/products/model'
import { type Product } from '@/features/products/types'
import { intlLocale, type MessageKey, useI18n } from '@/i18n'

import { createRestockPdf, type PdfGroup, type PdfItem } from './restockPdf'

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

/** What the sheet lists; it decides the title and the file name. */
export type PdfKind = 'all' | 'low' | 'out'

const PDF_TITLES = {
  all: 'restock.pdfTitleAll',
  low: 'restock.pdfTitleLow',
  out: 'restock.pdfTitleOut',
} as const satisfies Record<PdfKind, MessageKey>

const PDF_FILE_NAMES: Record<PdfKind, string> = {
  all: 'todos-los-productos',
  low: 'poco-stock',
  out: 'agotados',
}

interface SendPdfButtonProps {
  /** The products to put on the sheet, in order. */
  products: readonly Product[]
  kind: PdfKind
}

/** Makes the PDF (photo, name, barcode and stock of each product) and shares it. */
export function SendPdfButton({ products, kind }: SendPdfButtonProps) {
  const { getPhoto, categories } = useInventory()
  const { t, language, dir } = useI18n()
  const [status, setStatus] = useState<'idle' | 'busy' | 'failed'>('idle')

  const title = t(PDF_TITLES[kind])

  const send = async () => {
    setStatus('busy')
    try {
      const now = new Date()
      const items = new Map<string | null, PdfItem[]>()
      await Promise.all(
        products.map(async (product) => {
          const item: PdfItem = {
            name: product.name,
            barcode: product.barcode,
            quantity: formatAmount(product.quantity),
            unit: unitLabel(product.unit),
            photo: product.photoId ? ((await getPhoto(product.photoId)) ?? null) : null,
          }
          return [product.categoryId, item] as const
        }),
      ).then((pairs) => {
        for (const [categoryId, item] of pairs)
          items.set(categoryId, [...(items.get(categoryId) ?? []), item])
      })
      // One block per category, in the app's order, then the products without one.
      const hasCategories = categories.length > 0
      const groups: PdfGroup[] = [
        ...categories.map((category) => ({
          title: category.name,
          items: items.get(category.id) ?? [],
        })),
        { title: hasCategories ? t('inventory.noCategory') : null, items: items.get(null) ?? [] },
      ].filter((group) => group.items.length > 0)
      const blob = await createRestockPdf(groups, {
        title,
        date: new Intl.DateTimeFormat(intlLocale(language), { dateStyle: 'long' }).format(now),
        barcode: t('restock.pdfBarcode'),
        noBarcode: t('restock.pdfNoBarcode'),
        rtl: dir === 'rtl',
      })
      const day = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
        .map((part) => String(part).padStart(2, '0'))
        .join('-')
      await deliver(
        new File([blob], `${PDF_FILE_NAMES[kind]}-${day}.pdf`, { type: 'application/pdf' }),
        title,
      )
      setStatus('idle')
    } catch {
      setStatus('failed')
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant="primary"
        disabled={status === 'busy' || products.length === 0}
        onClick={() => void send()}
      >
        <ShareIcon />
        {t('restock.sendPdf', { count: products.length })}
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
  )
}
