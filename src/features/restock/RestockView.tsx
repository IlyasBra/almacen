import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { CopyIcon, ShareIcon } from '@/components/ui/icons'
import { useInventory } from '@/features/inventory/useInventory'
import { ProductRow } from '@/features/products/components/ProductRow'
import { formatAmount, suggestedOrder } from '@/features/products/model'
import { restockList, restockText } from '@/features/products/selectors'
import { type Product } from '@/features/products/types'

interface RestockViewProps {
  onOpen: (product: Product) => void
}

/** Sold out and low products, with the list ready to send to the supplier. */
export function RestockView({ onOpen }: RestockViewProps) {
  const { products } = useInventory()
  const list = restockList(products)
  const [feedback, setFeedback] = useState<string | null>(null)
  const text = restockText(products, formatAmount)
  const canShare = typeof navigator.share === 'function'

  if (list.length === 0) {
    return (
      <EmptyState
        title="Todo en orden"
        description="Ningún producto está agotado ni por debajo de su aviso."
      />
    )
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setFeedback('Lista copiada. Pégala en WhatsApp o donde quieras.')
    } catch {
      setFeedback('No se ha podido copiar. Usa «Enviar» o mantén pulsado el texto.')
    }
  }

  const share = async () => {
    try {
      await navigator.share({ title: 'Pedido para el almacén', text })
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
            Enviar lista
          </Button>
        )}
        <Button onClick={() => void copy()}>
          <CopyIcon />
          Copiar lista
        </Button>
      </div>
      {feedback && (
        <p role="status" className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
          {feedback}
        </p>
      )}
      <ul className="space-y-2" aria-label="Productos por reponer">
        {list.map((product) => {
          const order = suggestedOrder(product)
          return (
            <ProductRow
              key={product.id}
              product={product}
              detail={
                product.minimum > 0
                  ? `Aviso en ${formatAmount(product.minimum)}${order > 0 ? ` · pedir unas ${formatAmount(order)}` : ''}`
                  : 'Sin aviso configurado'
              }
              onOpen={onOpen}
            />
          )
        })}
      </ul>
      <p className="text-xs text-slate-600 dark:text-slate-400">
        «Pedir unas» sugiere la cantidad para llegar al doble del aviso.
      </p>
    </div>
  )
}
