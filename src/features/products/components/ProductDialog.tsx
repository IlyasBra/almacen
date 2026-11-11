import { type SubmitEvent, useId, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { BarcodeIcon, MinusIcon, PencilIcon, PlusIcon } from '@/components/ui/icons'
import { inputClassName } from '@/components/ui/styles'
import { useInventory } from '@/features/inventory/useInventory'
import { MovementList } from '@/features/movements/components/MovementList'
import { ProductPhoto } from '@/features/photos/ProductPhoto'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'

import { clampQuantity, formatAmount, parseAmount, stockStatus, unitLabel } from '../model'
import { type Product } from '../types'
import { usePendingStock } from '../usePendingStock'
import { StockBadge } from './StockBadge'

/** Continuous scanning: shown while the person scans product after product. */
export interface ScanSession {
  count: number
  onScanNext: () => void
  onFinish: () => void
}

interface ProductDialogProps {
  productId: string | null
  onClose: () => void
  onEdit: (product: Product) => void
  scan: ScanSession | null
}

/** Product card: big +/- buttons, other amounts, details and history. */
export function ProductDialog({ productId, onClose, onEdit, scan }: ProductDialogProps) {
  const { products, categories, movements, changeStock } = useInventory()
  const { t } = useI18n()
  const product = products.find((item) => item.id === productId) ?? null
  const { pending, add, flush } = usePendingStock(product?.id ?? null, changeStock)

  const close = () => {
    flush()
    onClose()
  }

  return (
    <Dialog
      open={product !== null}
      onClose={close}
      title={product?.name ?? t('product.fallbackTitle')}
    >
      {product && (
        <ProductDetails
          product={product}
          pending={pending}
          onAdd={add}
          onMove={(delta) => {
            flush()
            void changeStock(product.id, delta)
          }}
          categoryName={categories.find((category) => category.id === product.categoryId)?.name}
          history={movements.filter((movement) => movement.productId === product.id).slice(0, 30)}
          onEdit={() => {
            flush()
            onEdit(product)
          }}
          scan={
            scan && {
              ...scan,
              onScanNext: () => {
                flush()
                scan.onScanNext()
              },
              onFinish: () => {
                flush()
                scan.onFinish()
              },
            }
          }
        />
      )}
    </Dialog>
  )
}

interface ProductDetailsProps {
  product: Product
  pending: number
  onAdd: (delta: number) => void
  onMove: (delta: number) => void
  categoryName: string | undefined
  history: ReturnType<typeof useInventory>['movements']
  onEdit: () => void
  scan: ScanSession | null
}

function ProductDetails({
  product,
  pending,
  onAdd,
  onMove,
  categoryName,
  history,
  onEdit,
  scan,
}: ProductDetailsProps) {
  const { t, tn } = useI18n()
  const quantity = clampQuantity(product.quantity + pending)
  const unit = unitLabel(product.unit)
  const amountId = useId()
  const [amount, setAmount] = useState('')
  const [amountError, setAmountError] = useState<string | null>(null)

  const submitAmount = (direction: 1 | -1) => (event?: SubmitEvent<HTMLFormElement>) => {
    event?.preventDefault()
    const value = parseAmount(amount)
    if (!(value > 0)) {
      setAmountError(t('product.amountError'))
      return
    }
    if (direction === -1 && value > quantity) {
      setAmountError(t('product.notEnough', { amount: formatAmount(quantity), unit }))
      return
    }
    setAmountError(null)
    setAmount('')
    onMove(direction * value)
  }

  return (
    <div className="space-y-5">
      {scan && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 dark:bg-slate-800 dark:text-brand-400"
        >
          <BarcodeIcon className="size-4" />
          {t('product.scanMode', { scanned: tn('count.scanned', scan.count) })}
        </p>
      )}

      {product.photoId && (
        <ProductPhoto
          photoId={product.photoId}
          name={product.name}
          className="aspect-[4/3] w-full rounded-xl text-5xl"
        />
      )}

      <section
        aria-label={t('product.stock')}
        className="rounded-xl p-4 ring-1 ring-slate-200 dark:ring-slate-700"
      >
        <div className="grid grid-cols-[4.5rem_1fr_4.5rem] items-center gap-3">
          <button
            type="button"
            onClick={() => {
              onAdd(-1)
            }}
            disabled={quantity <= 0}
            className="grid h-18 place-items-center rounded-2xl bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-40 dark:bg-red-950 dark:text-red-300"
          >
            <MinusIcon className="size-8" />
            <span className="sr-only">{t('product.removeOne')}</span>
          </button>
          <div className="text-center">
            <p
              aria-live="polite"
              dir="ltr"
              className="text-5xl leading-none font-semibold tabular-nums"
              data-testid="stock-quantity"
            >
              {formatAmount(quantity)}
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{unit}</p>
            <div className="mt-1.5">
              <StockBadge status={stockStatus(quantity, product.minimum)} />
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onAdd(1)
            }}
            className="grid h-18 place-items-center rounded-2xl bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-slate-800 dark:text-brand-400"
          >
            <PlusIcon className="size-8" />
            <span className="sr-only">{t('product.addOne')}</span>
          </button>
        </div>

        <form onSubmit={submitAmount(1)} className="mt-4" noValidate>
          <label htmlFor={amountId} className="mb-1.5 block text-sm font-medium">
            {t('product.otherAmount')}
          </label>
          <div className="flex gap-2">
            <input
              id={amountId}
              inputMode="decimal"
              autoComplete="off"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value)
              }}
              aria-invalid={amountError !== null}
              aria-describedby={amountError ? `${amountId}-error` : undefined}
              placeholder={t('product.amountPlaceholder')}
              className={cn(inputClassName, 'min-w-0')}
            />
            <Button type="submit">{t('product.in')}</Button>
            <Button
              onClick={() => {
                submitAmount(-1)()
              }}
            >
              {t('product.out')}
            </Button>
          </div>
          {amountError && (
            <p id={`${amountId}-error`} className="mt-1.5 text-sm text-red-700 dark:text-red-400">
              {amountError}
            </p>
          )}
        </form>
      </section>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <Fact label={t('product.category')} value={categoryName ?? '—'} />
        <Fact label={t('product.location')} value={product.location || '—'} />
        <Fact
          label={t('product.minimum')}
          value={
            product.minimum > 0
              ? `${formatAmount(product.minimum)} ${unit}`
              : t('product.noWarning')
          }
        />
        <Fact
          label={t('product.barcode')}
          value={product.barcode || '—'}
          mono={product.barcode !== ''}
        />
        {product.notes && <Fact label={t('product.notes')} value={product.notes} wide />}
      </dl>

      <Button onClick={onEdit} className="w-full justify-center">
        <PencilIcon />
        {t('product.edit')}
      </Button>

      <section aria-labelledby={`${amountId}-history`} className="space-y-2">
        <h3 id={`${amountId}-history`} className="text-base font-semibold">
          {t('product.history')}
        </h3>
        {history.length > 0 ? (
          <MovementList movements={history} showProduct={false} />
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-400">{t('product.noHistory')}</p>
        )}
      </section>

      {scan && (
        <div className="sticky bottom-0 -mx-5 -mb-[calc(1.25rem+env(safe-area-inset-bottom))] flex gap-2 border-t border-slate-200 bg-white px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:-mb-5 dark:border-slate-700 dark:bg-slate-900">
          <Button variant="primary" onClick={scan.onScanNext} className="flex-1 justify-center">
            <BarcodeIcon />
            {t('product.scanNext')}
          </Button>
          <Button onClick={scan.onFinish}>{t('product.finish')}</Button>
        </div>
      )}
    </div>
  )
}

function Fact({
  label,
  value,
  mono = false,
  wide = false,
}: {
  label: string
  value: string
  mono?: boolean
  wide?: boolean
}) {
  return (
    <div className={cn('rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800', wide && 'col-span-2')}>
      <dt className="text-xs text-slate-600 dark:text-slate-400">{label}</dt>
      <dd className={cn('font-medium break-words', mono && 'font-mono')}>{value}</dd>
    </div>
  )
}
