import { matchesQuery } from '@/lib/text'

import { stockStatus, suggestedOrder } from './model'
import { type Product, type StockStatus } from './types'

/** "all", "none" (no category) or a category id. */
export type CategoryFilter = 'all' | 'none' | (string & {})

export interface ProductFilter {
  query: string
  category: CategoryFilter
  status: StockStatus | 'all'
}

export const EMPTY_PRODUCT_FILTER: ProductFilter = { query: '', category: 'all', status: 'all' }

export function productStatus(product: Pick<Product, 'quantity' | 'minimum'>): StockStatus {
  return stockStatus(product.quantity, product.minimum)
}

/**
 * Products matching every part of the filter. The search looks at the name,
 * barcode, location and notes, ignoring case and accents.
 */
export function filterProducts(products: readonly Product[], filter: ProductFilter): Product[] {
  return products.filter((product) => {
    if (filter.category === 'none' && product.categoryId !== null) return false
    if (
      filter.category !== 'all' &&
      filter.category !== 'none' &&
      product.categoryId !== filter.category
    )
      return false
    if (filter.status !== 'all' && productStatus(product) !== filter.status) return false
    const text = [product.name, product.barcode, product.location, product.notes].join(' ')
    return matchesQuery(text, filter.query)
  })
}

export interface StockSummary {
  total: number
  low: number
  out: number
}

export function summarizeStock(products: readonly Product[]): StockSummary {
  const summary: StockSummary = { total: products.length, low: 0, out: 0 }
  for (const product of products) {
    const status = productStatus(product)
    if (status === 'low') summary.low++
    if (status === 'out') summary.out++
  }
  return summary
}

/** Products to order: sold out first, then low, each alphabetical. */
export function restockList(products: readonly Product[]): Product[] {
  return products
    .filter((product) => productStatus(product) !== 'ok')
    .toSorted(
      (a, b) =>
        Number(productStatus(a) !== 'out') - Number(productStatus(b) !== 'out') ||
        a.name.localeCompare(b.name, 'es'),
    )
}

/** Plain-text order list, ready to paste in a message. */
export function restockText(products: readonly Product[], format: (n: number) => string): string {
  const lines = restockList(products).map((product) => {
    const order = suggestedOrder(product)
    const unit = product.unit
    const base = `- ${product.name}: quedan ${format(product.quantity)} ${unit}`
    return order > 0 ? `${base} (pedir unas ${format(order)})` : base
  })
  return ['Pedido para el almacén:', ...lines].join('\n')
}

export function findByBarcode(products: readonly Product[], barcode: string): Product | undefined {
  const code = barcode.trim()
  return code ? products.find((product) => product.barcode === code) : undefined
}
