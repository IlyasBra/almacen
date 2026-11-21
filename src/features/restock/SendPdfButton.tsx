import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { ShareIcon } from '@/components/ui/icons'
import { useInventory } from '@/features/inventory/useInventory'
import { type Product } from '@/features/products/types'
import { intlLocale, useI18n } from '@/i18n'

import { createRestockPdf } from './restockPdf'

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

interface SendPdfButtonProps {
  /** The products to put on the sheet, in order. */
  products: readonly Product[]
}

/** Makes the supplier PDF (photo, name and barcode of each product) and shares it. */
export function SendPdfButton({ products }: SendPdfButtonProps) {
  const { getPhoto } = useInventory()
  const { t, language, dir } = useI18n()
  const [status, setStatus] = useState<'idle' | 'busy' | 'failed'>('idle')

  const send = async () => {
    setStatus('busy')
    try {
      const now = new Date()
      const items = await Promise.all(
        products.map(async (product) => ({
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
